import { supabase } from '../../lib/supabase'

export interface AnalyzeTextRequest {
  text: string
  analysisType: string
  words: number
  pagesEstimated: number
  source: 'pasted'
}

export interface AnalyzeTextResponse {
  success: boolean
  result?: string
  error?: string
  pages_total?: number
  pages_free?: number
  pages_charged?: number
  mock?: boolean
}

export async function analyzePastedText(payload: AnalyzeTextRequest): Promise<AnalyzeTextResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token

    const supabaseUrl = 'https://utvolelclhzesimpwbrl.supabase.co'
    const url = `${supabaseUrl}/functions/v1/analyze-text`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        text: payload.text,
        analysis_type: payload.analysisType,
        words: payload.words,
        pages_estimated: payload.pagesEstimated,
        source: payload.source,
        document_id: null,
      }),
      signal: controller.signal,
    })

    let data: any = null
    try {
      data = await res.json()
    } catch (_) {
      // ignore JSON parse errors; will fall back to generic messages
    }

    if (!res.ok) {
      return {
        success: false,
        error: data?.message || data?.error || `Request failed with status ${res.status}`,
      }
    }

    return {
      success: true,
      result: data?.result ?? data?.analysis_result,
      pages_total: data?.pages_total,
      pages_free: data?.pages_free,
      pages_charged: data?.pages_charged,
      mock: data?.mock,
    }
  } catch (err: any) {
    const message = err?.name === 'AbortError' ? 'Request timed out' : (err?.message || 'Network error')
    return { success: false, error: message }
  } finally {
    clearTimeout(timeout)
  }
}


