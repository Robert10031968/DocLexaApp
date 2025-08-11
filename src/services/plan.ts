import { SupabaseClient } from '@supabase/supabase-js'

export type UserPlanStatus = {
  pages_available: number
  is_unlimited: boolean
  subscription_expires_at: string | null
  current_plan_label: string | null
}

export type CanAnalyzePagesResponse = {
  allowed: boolean
  reason: string | null
  pages_available: number
  pages_to_charge: number
  pages_free: number
}

function ensurePositiveInteger(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || Math.floor(value) !== value || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`)
  }
}

function ensureNonEmptyString(value: string, fieldName: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`)
  }
}

export async function getUserPlanStatus(supabase: SupabaseClient): Promise<UserPlanStatus> {
  // Try RPC first (preferred, uses auth context on the server)
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_plan_status')

  if (!rpcError && rpcData) {
    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData
    if (!row) throw new Error('No plan status returned')
    return {
      pages_available: Number(row.pages_available ?? 0),
      is_unlimited: Boolean(row.is_unlimited ?? false),
      subscription_expires_at: row.subscription_expires_at ?? null,
      current_plan_label: row.current_plan_label ?? null,
    }
  }

  // Fallback to selecting from a view/table if RPC is unavailable
  const { data: viewData, error: viewError } = await supabase
    .from('user_plan_status')
    .select('pages_available, is_unlimited, subscription_expires_at, current_plan_label')
    .single()

  if (viewError) {
    const reason = rpcError?.message || viewError.message
    throw new Error(`Failed to load user plan status: ${reason}`)
  }

  return {
    pages_available: Number(viewData?.pages_available ?? 0),
    is_unlimited: Boolean(viewData?.is_unlimited ?? false),
    subscription_expires_at: viewData?.subscription_expires_at ?? null,
    current_plan_label: viewData?.current_plan_label ?? null,
  }
}

export async function canAnalyzePages(
  supabase: SupabaseClient,
  userId: string,
  pagesRequired: number,
): Promise<CanAnalyzePagesResponse> {
  ensureNonEmptyString(userId, 'userId')
  ensurePositiveInteger(pagesRequired, 'pagesRequired')

  const { data, error } = await supabase.rpc('can_analyze_pages', {
    p_user_id: userId,
    p_pages_required: pagesRequired,
  })

  if (error) {
    throw new Error(`Failed to check page allowance: ${error.message}`)
  }

  const row: any = Array.isArray(data) ? data[0] : data
  if (!row) {
    throw new Error('Malformed response from can_analyze_pages')
  }

  const pagesFree = Number(row.pages_free ?? 0)
  const pagesToCharge = Number(
    row.pages_to_charge ?? Math.max(0, pagesRequired - (Number.isFinite(pagesFree) ? pagesFree : 0)),
  )

  return {
    allowed: Boolean(row.allowed ?? false),
    reason: row.reason ?? null,
    pages_available: Number(row.pages_available ?? 0),
    pages_to_charge: pagesToCharge,
    pages_free: pagesFree,
  }
}


