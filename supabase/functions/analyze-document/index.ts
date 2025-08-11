// Supabase Edge Function - Analyze Document
// Path: supabase/functions/analyze-document/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type CanAnalyzePagesResult = {
  allowed: boolean
  pages_free: number
  reason?: string | null
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function readEnvInt(name: string, defaultValue: number): number {
  const raw = Deno.env.get(name)
  if (!raw) return defaultValue
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function badRequest(message: string, extra?: Record<string, unknown>): Response {
  return json({ success: false, error: message, ...(extra ?? {}) }, 400)
}

function unauthorized(message = 'Unauthorized'): Response {
  return json({ success: false, error: message }, 401)
}

function isUuidV4(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return badRequest('Invalid method. Use POST.')
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return unauthorized()
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
      return json({ success: false, error: 'Server misconfiguration' }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      return unauthorized('Invalid or expired token')
    }
    const userId = userData.user.id

    let payload: any
    try {
      payload = await req.json()
    } catch (_e) {
      return badRequest('Invalid JSON payload')
    }

    const pageCountRaw = payload?.page_count
    const documentId: string | undefined = payload?.document_id

    if (typeof pageCountRaw !== 'number' || !Number.isFinite(pageCountRaw)) {
      return badRequest('`page_count` must be a number')
    }
    const pageCount = Math.max(0, Math.floor(pageCountRaw))
    if (pageCount <= 0) {
      return badRequest('`page_count` must be a positive integer')
    }

    if (!documentId || typeof documentId !== 'string' || !isUuidV4(documentId)) {
      return badRequest('`document_id` must be a valid UUID v4')
    }

    // Max pages validation
    const MAX_PAGES_PER_DOCUMENT = readEnvInt('MAX_PAGES_PER_DOCUMENT', 100)
    if (pageCount > MAX_PAGES_PER_DOCUMENT) {
      return json(
        {
          success: false,
          code: 'DOC_TOO_LARGE',
          max_pages: MAX_PAGES_PER_DOCUMENT,
          message: 'Document exceeds allowed page limit. Please upgrade or split the file.',
        },
        400,
      )
    }

    // Check allowance before charging credits
    const { data: allowanceData, error: allowanceError } = await supabase.rpc(
      'can_analyze_pages',
      { p_user_id: userId, p_pages_required: pageCount },
    )

    if (allowanceError) {
      console.error('can_analyze_pages error:', allowanceError)
      return json({ success: false, error: 'Failed to check page allowance' }, 500)
    }

    const allowance = allowanceData as CanAnalyzePagesResult | null
    const pagesFree = allowance?.pages_free ?? 0
    const isAllowed = allowance?.allowed ?? false

    if (!isAllowed) {
      return json(
        {
          success: false,
          code: 'PAYMENT_REQUIRED',
          reason: allowance?.reason ?? 'Not allowed to analyze the requested number of pages',
          pages_free: pagesFree,
        },
        402,
      )
    }

    // Placeholder for AI processing
    // In a real implementation, perform the document analysis here.
    // If processing fails, return 500 with an error message.
    // For now, we assume it succeeds.

    // Consume pages after successful processing
    const { error: consumeError } = await supabase.rpc('consume_pages_with_overflow', {
      p_user_id: userId,
      p_pages_required: pageCount,
      p_document_id: documentId,
      p_tokens_used: null,
    })

    if (consumeError) {
      console.error('consume_pages_with_overflow error:', consumeError)
      return json({ success: false, error: 'Failed to record page consumption' }, 500)
    }

    // Log analysis
    try {
      const { error: logError } = await supabase
        .from('analysis_logs')
        .insert({
          user_id: userId,
          document_id: documentId,
          source: 'upload',
          pages_total: pageCount,
          pages_charged: Math.max(0, pageCount - pagesFree),
          pages_free: pagesFree,
          analyzed_at: new Date().toISOString(),
        })
      if (logError) console.warn('analysis_logs insert warning:', logError.message)
    } catch (e) {
      console.warn('analysis_logs insert exception:', (e as any)?.message)
    }

    return json({
      success: true,
      document_id: documentId,
      pages_total: pageCount,
      pages_free: pagesFree,
      pages_charged: Math.max(0, pageCount - pagesFree),
    })
  } catch (err: any) {
    console.error('analyze-document unexpected error:', err)
    return json({ success: false, error: err?.message ?? 'Unexpected error' }, 500)
  }
})


