import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = crypto.randomUUID()
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
  if (!authHeader) {
    return corsJson({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED', request_id: requestId }, 401)
  }

  const url = new URL(req.url)
  const limitParam = url.searchParams.get('limit')
  const offsetParam = url.searchParams.get('offset')

  const limitRaw = Number.parseInt(limitParam || '20', 10)
  const offsetRaw = Number.parseInt(offsetParam || '0', 10)
  const limit = clamp(Number.isFinite(limitRaw) ? limitRaw : 20, 1, 100)
  const offset = clamp(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0, 10000)

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return corsJson({ success: false, error: 'Server misconfiguration', code: 'SERVER_MISCONFIG', request_id: requestId }, 500)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    return corsJson({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED', request_id: requestId }, 401)
  }

  const from = offset
  const to = offset + limit - 1

  const query = supabase
    .from('analyses')
    .select('id, created_at, doc_type, summary_tldr, encrypted')
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, error } = await query

  if (error) {
    return corsJson({ success: false, error: 'Failed to fetch analyses', code: 'FETCH_FAILED', request_id: requestId }, 500)
  }

  return corsJson({ success: true, items: data ?? [] })
}


