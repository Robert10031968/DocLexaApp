import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decryptJson, generateKeyFromEnv } from '../../../lib/crypto'
import { requireEncryptionKeyOrThrow } from '../../../lib/envGuard'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, Authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function corsJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function corsNoContent(): Response {
  return new Response(null, { status: 204, headers: { ...CORS_HEADERS } })
}

export async function OPTIONS(): Promise<Response> {
  return corsNoContent()
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  const requestId = crypto.randomUUID()
  const analysisId = params?.id

  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
  if (!authHeader) {
    console.warn(`[${requestId}] Missing Authorization header`)
    return corsJson({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED', request_id: requestId }, 401)
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(`[${requestId}] Missing Supabase env config`)
    return corsJson({ success: false, error: 'Server misconfiguration', code: 'SERVER_MISCONFIG', request_id: requestId }, 500)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    console.warn(`[${requestId}] Invalid or expired token`)
    return corsJson({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED', request_id: requestId }, 401)
  }

  try {
    // Ensure encryption key is configured (fail fast with clear error)
    requireEncryptionKeyOrThrow()
  } catch (e: any) {
    return corsJson({ success: false, error: e?.message || 'Encryption key missing', code: 'ENC_KEY_MISSING', request_id: requestId }, 500)
  }

  const { data: row, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .single()

  if (error || !row) {
    console.warn(`[${requestId}] Analysis not found or RLS denied. id=${analysisId}`)
    return corsJson({ success: false, error: 'Not found', code: 'NOT_FOUND', request_id: requestId }, 404)
  }

  try {
    let payload: any = {}
    if (row.encrypted === true) {
      // Ensure key is present and valid
      await generateKeyFromEnv()
      payload = await decryptJson<any>({ iv: row.iv as string, ciphertext: row.ciphertext as string })
    } else {
      // Backward compatibility: return commonly used plaintext fields if present
      const plaintext: Record<string, unknown> = {}
      for (const key of ['analysis', 'data', 'payload', 'result', 'content', 'analysis_json']) {
        if (row[key] != null) plaintext[key] = row[key]
      }
      payload = plaintext
    }

    const summary_tldr = (row.summary_tldr as string | null) ?? null
    return corsJson({ success: true, analysisId, summary_tldr, ...payload }, 200)
  } catch (e: any) {
    console.error(`[${requestId}] Decrypt or fetch failed:`, e?.message || e)
    return corsJson({ success: false, code: 'DECRYPT_FAILED', error: e?.message || 'Failed to decrypt analysis', request_id: requestId }, 500)
  }
}


