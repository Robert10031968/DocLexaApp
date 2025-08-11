import { supabase } from './supabase'

export interface AnalyzePastedTextRequest {
  text: string
  analysisType: 'summary' | 'sentiment' | 'keyword_extraction'
  words: number
  pagesEstimated: number
  source: 'pasted'
}

export interface AnalyzePastedTextResponse {
  success: boolean
  result?: string
  error?: string
  document_id?: string | null
  pages_total?: number
  pages_free?: number
  pages_charged?: number
  mock?: boolean
}

export async function analyzePastedText(
  payload: AnalyzePastedTextRequest,
): Promise<AnalyzePastedTextResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-text', {
      body: {
        text: payload.text,
        analysis_type: payload.analysisType,
        words: payload.words,
        pages_estimated: payload.pagesEstimated,
        source: payload.source,
        document_id: null,
      },
    })

    if (error) {
      return { success: false, error: error.message || 'Failed to analyze text' }
    }

    return {
      success: !!data?.success,
      result: data?.result ?? data?.analysis_result,
      error: data?.error,
      document_id: data?.document_id ?? null,
      pages_total: data?.pages_total,
      pages_free: data?.pages_free,
      pages_charged: data?.pages_charged,
      mock: data?.mock,
    }
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to analyze text' }
  }
}


