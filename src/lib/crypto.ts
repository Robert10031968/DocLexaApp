/**
 * Lightweight AES-GCM (256-bit) helpers for encrypting/decrypting JSON payloads
 * Uses Web Crypto API available in Node 18+ (globalThis.crypto or node:crypto webcrypto)
 */

import { webcrypto } from 'node:crypto'

const subtle: SubtleCrypto = (globalThis.crypto?.subtle ?? webcrypto.subtle) as SubtleCrypto
const nodeCrypto = (globalThis.crypto ?? webcrypto)

function toUtf8(input: string): Uint8Array {
  return new TextEncoder().encode(input)
}

function fromUtf8(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return new TextDecoder().decode(u8)
}

export function b64encode(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return Buffer.from(u8).toString('base64')
}

export function b64decode(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'))
}

function hexDecode(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, '')
  if (!/^([0-9a-fA-F]{2})+$/.test(clean)) {
    throw new Error('Invalid hex encoding')
  }
  return new Uint8Array(Buffer.from(clean, 'hex'))
}

/**
 * Decode a 32-byte key from env. Accepts base64 or hex input.
 * Throws explicit errors on missing or invalid length.
 */
export function decodeKeyFromEnv(raw: string | undefined | null): Uint8Array {
  if (!raw) throw new Error('Missing ANALYSIS_ENC_KEY')

  let keyBytes: Uint8Array | null = null
  // Try base64 first
  try {
    const b = b64decode(raw)
    if (b.byteLength > 0) keyBytes = b
  } catch { /* ignore */ }

  // If base64 failed or wrong length, try hex (commonly 64 chars)
  if (!keyBytes || keyBytes.byteLength !== 32) {
    try {
      const h = hexDecode(raw)
      keyBytes = h
    } catch { /* ignore */ }
  }

  if (!keyBytes || keyBytes.byteLength !== 32) {
    throw new Error('Invalid ANALYSIS_ENC_KEY length (must decode to 32 bytes)')
  }

  return keyBytes
}

let cachedKeyPromise: Promise<CryptoKey> | null = null

/**
 * Import and cache the AES-GCM 256-bit key from ANALYSIS_ENC_KEY.
 */
export async function generateKeyFromEnv(): Promise<CryptoKey> {
  if (cachedKeyPromise) return cachedKeyPromise
  const raw = process.env.ANALYSIS_ENC_KEY
  const keyBytes = decodeKeyFromEnv(raw)
  cachedKeyPromise = subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  return cachedKeyPromise
}

export type EncryptedPayload = { iv: string; ciphertext: string; alg: 'AES-GCM' }

/**
 * Encrypt a JSON-serializable value using AES-GCM (256-bit).
 */
export async function encryptJson<T>(data: T): Promise<EncryptedPayload> {
  try {
    const key = await generateKeyFromEnv()
    const iv = new Uint8Array(12)
    nodeCrypto.getRandomValues(iv)
    const plaintext = JSON.stringify(data)
    const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, toUtf8(plaintext))
    return { iv: b64encode(iv), ciphertext: b64encode(ct), alg: 'AES-GCM' }
  } catch (err: any) {
    if (err?.message?.includes('Missing ANALYSIS_ENC_KEY')) throw err
    if (err?.message?.includes('Invalid ANALYSIS_ENC_KEY')) throw err
    throw new Error(`Encryption failed: ${err?.message || String(err)}`)
  }
}

/**
 * Decrypt a previously encrypted JSON payload.
 */
export async function decryptJson<T>(payload: { iv: string; ciphertext: string }): Promise<T> {
  try {
    const key = await generateKeyFromEnv()
    const iv = b64decode(payload.iv)
    const ct = b64decode(payload.ciphertext)
    const pt = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
    return JSON.parse(fromUtf8(pt)) as T
  } catch (err: any) {
    if (err?.message?.includes('Missing ANALYSIS_ENC_KEY')) throw err
    if (err?.message?.includes('Invalid ANALYSIS_ENC_KEY')) throw err
    // Authentication/tag failure or JSON parse error
    throw new Error(`Decryption failed: ${err?.message || String(err)}`)
  }
}

/**
 * Feature flag: allow temporarily disabling encryption.
 * Returns true unless ANALYSIS_ENCRYPTION_ENABLED is explicitly set to 'false'.
 */
export function isEncryptionEnabled(): boolean {
  return process.env.ANALYSIS_ENCRYPTION_ENABLED !== 'false'
}


