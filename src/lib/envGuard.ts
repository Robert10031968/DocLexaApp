/**
 * Ensures ANALYSIS_ENC_KEY is present in the environment.
 * Throws a clear error if missing.
 */
export function requireEncryptionKeyOrThrow(): void {
  const raw = process.env.ANALYSIS_ENC_KEY
  if (!raw) throw new Error('ANALYSIS_ENC_KEY is missing')
}


