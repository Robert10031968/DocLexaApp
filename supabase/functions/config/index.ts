// Supabase Edge Function - Config
// Path: supabase/functions/config/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

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

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Allow GET or POST for flexibility
    if (req.method !== 'GET' && req.method !== 'POST') {
      return json({ success: false, error: 'Method not allowed' }, 405)
    }

    const maxPages = readEnvInt('MAX_PAGES_PER_DOCUMENT', 100)
    const wordsPerPage = readEnvInt('WORDS_PER_PAGE', 300)

    return json({
      success: true,
      MAX_PAGES_PER_DOCUMENT: maxPages,
      WORDS_PER_PAGE: wordsPerPage,
    })
  } catch (err: any) {
    console.error('config function error:', err)
    return json({ success: false, error: err?.message ?? 'Unexpected error' }, 500)
  }
})


