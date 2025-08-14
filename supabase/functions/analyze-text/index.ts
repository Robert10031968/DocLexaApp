// Supabase Edge Function - Analyze Text
// Path: supabase/functions/analyze-text/index.ts

// @ts-ignore - Deno URL import resolved at runtime
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @ts-ignore - Deno URL import resolved at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Minimal Deno typings for linter/TS satisfaction in non-Deno tools
declare const Deno: { env: { get(name: string): string | undefined } }

type CanAnalyzePagesResult = {
  allowed: boolean
  pages_free: number
  reason?: string | null
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, Authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function readEnvInt(name: string, defaultValue: number): number {
  const raw = Deno.env.get(name)
  if (!raw) return defaultValue
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

function clampEnvInt(name: string, min: number, max: number, def: number): number {
  const value = readEnvInt(name, def)
  if (!Number.isFinite(value)) return def
  return Math.min(max, Math.max(min, value))
}

function corsJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function corsNoContent(): Response {
  return new Response(null, { status: 204, headers: { ...corsHeaders } })
}

function fail(status: number, code: string, message: string, extra?: Record<string, unknown>): Response {
  return corsJson({ success: false, code, error: message, ...(extra ?? {}) }, status)
}

function isUuidV4(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

serve(async (req: Request) => {
  const requestId = crypto.randomUUID()
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return corsNoContent()
  }

  try {
    if (req.method !== 'POST') {
      return fail(400, 'INVALID_METHOD', 'Invalid method. Use POST.', { request_id: requestId })
    }

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return fail(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json', { request_id: requestId })
    }

    // Accept both 'Authorization' and 'authorization'
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
    if (!authHeader) {
      return fail(401, 'UNAUTHORIZED', 'Missing Authorization header', { request_id: requestId })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(`[${requestId}] Missing Supabase config`)
      return fail(500, 'SERVER_MISCONFIG', 'Server misconfiguration', { request_id: requestId })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      return fail(401, 'UNAUTHORIZED', 'Invalid or expired token', { request_id: requestId })
    }
    const userId = userData.user.id

    let payload: any
    try {
      payload = await req.json()
    } catch (_e) {
      return fail(400, 'INVALID_JSON', 'Invalid JSON payload', { request_id: requestId })
    }

    const wordsRaw = payload?.words
    const documentIdRaw: unknown = payload?.document_id ?? null

    if (typeof wordsRaw !== 'number' || !Number.isFinite(wordsRaw)) {
      return fail(400, 'INVALID_INPUT', '`words` must be a number', { request_id: requestId })
    }
    const words = Math.max(0, Math.floor(wordsRaw))
    if (words <= 0) {
      return fail(400, 'INVALID_INPUT', '`words` must be a positive integer', { request_id: requestId })
    }

    // Upper bound on words to protect service
    const MAX_WORDS = 250_000
    if (words > MAX_WORDS) {
      return fail(413, 'PAYLOAD_TOO_LARGE', `Text is too large. Max words: ${MAX_WORDS}`, { request_id: requestId, max_words: MAX_WORDS })
    }

    const WORDS_PER_PAGE = clampEnvInt('WORDS_PER_PAGE', 150, 1000, 300)
    const pages = Math.max(1, Math.ceil(words / WORDS_PER_PAGE))

    // Optional document_id (if provided, must be UUID v4)
    const documentId = typeof documentIdRaw === 'string' && isUuidV4(documentIdRaw)
      ? documentIdRaw
      : null

    // Soft cap validation
    const MAX_PAGES_PER_DOCUMENT = clampEnvInt('MAX_PAGES_PER_DOCUMENT', 1, 10000, 100)
    if (pages > MAX_PAGES_PER_DOCUMENT) {
      return fail(413, 'DOC_TOO_LARGE', 'Document exceeds allowed page limit. Please upgrade or split the file.', { request_id: requestId, max_pages: MAX_PAGES_PER_DOCUMENT })
    }

    // Pre-charge check
    const { data: allowanceData, error: allowanceError } = await supabase.rpc(
      'can_analyze_pages',
      { p_user_id: userId, p_pages_required: pages },
    )

    if (allowanceError) {
      console.error(`[${requestId}] can_analyze_pages error:`, allowanceError?.message || allowanceError)
      return fail(500, 'ALLOWANCE_CHECK_FAILED', 'Failed to check page allowance', { request_id: requestId })
    }

    // Validate allowance shape
    const rawAllowance = allowanceData as unknown
    let allowance: CanAnalyzePagesResult = { allowed: false, pages_free: 0 }
    if (
      rawAllowance &&
      typeof (rawAllowance as any).allowed === 'boolean' &&
      Number.isFinite((rawAllowance as any).pages_free)
    ) {
      const pf = Math.max(0, Math.floor((rawAllowance as any).pages_free))
      allowance = { allowed: (rawAllowance as any).allowed, pages_free: pf, reason: (rawAllowance as any).reason ?? undefined }
    }
    const pagesFree = allowance.pages_free
    const isAllowed = allowance.allowed

    if (!isAllowed) {
      return fail(402, 'PAYMENT_REQUIRED', 'Not allowed to analyze the requested number of pages', {
        request_id: requestId,
        reason: allowance.reason ?? undefined,
        pages_free: pagesFree,
      })
    }

    // Placeholder for AI processing of text content
    // In a real implementation, perform the text analysis here.

    // Consume pages after successful processing
    const consumeArgs: Record<string, unknown> = {
      p_user_id: userId,
      p_pages_required: pages,
      p_tokens_used: 0,
    }
    if (documentId) consumeArgs.p_document_id = documentId
    const { error: consumeError } = await supabase.rpc('consume_pages_with_overflow', consumeArgs)

    if (consumeError) {
      console.error(`[${requestId}] consume_pages_with_overflow error:`, consumeError?.message || consumeError)
      return fail(500, 'CONSUME_PAGES_FAILED', 'Failed to record page consumption', { request_id: requestId })
    }

    // Log analysis
    try {
      const pagesCharged = Math.max(0, pages - Math.min(pages, pagesFree))
      const insertPayload: Record<string, unknown> = {
        user_id: userId,
        source: 'pasted',
        pages_total: pages,
        pages_charged: pagesCharged,
        pages_free: pagesFree,
        analyzed_at: new Date().toISOString(),
      }
      if (documentId) insertPayload.document_id = documentId
      const { error: logError } = await supabase
        .from('analysis_logs')
        .insert(insertPayload)
      if (logError) console.warn(`[${requestId}] analysis_logs insert warning:`, logError.message)
    } catch (e) {
      console.warn(`[${requestId}] analysis_logs insert exception:`, (e as any)?.message)
    }

    return corsJson({
      success: true,
      document_id: documentId,
      pages_total: pages,
      pages_free: pagesFree,
      pages_charged: Math.max(0, pages - pagesFree),
      mock: true,
      request_id: requestId,
    })
  } catch (err: any) {
    console.error(`[${requestId}] analyze-text unexpected error:`, err?.message || err)
    return fail(500, 'UNEXPECTED', err?.message ?? 'Unexpected error', { request_id: requestId })
  }
})


