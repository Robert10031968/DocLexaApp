import type { SupabaseClient } from '@supabase/supabase-js'

export type RemoteConfig = {
  MAX_PAGES_PER_DOCUMENT: number
  WORDS_PER_PAGE: number
}

const DEFAULTS: RemoteConfig = {
  MAX_PAGES_PER_DOCUMENT: 100,
  WORDS_PER_PAGE: 300,
}

let cachedConfig: RemoteConfig | null = null
let cachedAt = 0
const CACHE_TTL_MS = 60_000

export async function getRemoteConfig(supabase?: SupabaseClient): Promise<RemoteConfig> {
  const now = Date.now()
  if (cachedConfig && now - cachedAt < CACHE_TTL_MS) return cachedConfig

  if (!supabase) {
    cachedConfig = DEFAULTS
    cachedAt = now
    return cachedConfig
  }

  try {
    const { data, error } = await supabase.functions.invoke('config', { body: {} })
    if (error || !data?.success) {
      cachedConfig = DEFAULTS
    } else {
      cachedConfig = {
        MAX_PAGES_PER_DOCUMENT: Number(data.MAX_PAGES_PER_DOCUMENT ?? DEFAULTS.MAX_PAGES_PER_DOCUMENT),
        WORDS_PER_PAGE: Number(data.WORDS_PER_PAGE ?? DEFAULTS.WORDS_PER_PAGE),
      }
    }
  } catch (_e) {
    cachedConfig = DEFAULTS
  }

  cachedAt = now
  return cachedConfig
}

export async function getMaxPagesPerDocument(supabase?: SupabaseClient): Promise<number> {
  const cfg = await getRemoteConfig(supabase)
  return cfg.MAX_PAGES_PER_DOCUMENT
}

export async function getWordsPerPage(supabase?: SupabaseClient): Promise<number> {
  const cfg = await getRemoteConfig(supabase)
  return cfg.WORDS_PER_PAGE
}


