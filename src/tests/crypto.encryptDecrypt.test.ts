import { encryptJson, decryptJson } from '../lib/crypto'

const FIXED_KEY_B64 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

describe('crypto encrypt/decrypt', () => {
  const prev = process.env.ANALYSIS_ENC_KEY
  beforeAll(() => {
    process.env.ANALYSIS_ENC_KEY = FIXED_KEY_B64
  })
  afterAll(() => {
    if (prev == null) delete process.env.ANALYSIS_ENC_KEY
    else process.env.ANALYSIS_ENC_KEY = prev
  })

  it('round-trips JSON payload', async () => {
    const obj = { a: 1 }
    const enc = await encryptJson(obj)
    const dec = await decryptJson<typeof obj>({ iv: enc.iv, ciphertext: enc.ciphertext })
    expect(dec).toEqual(obj)
  })

  it('throws when ciphertext is tampered', async () => {
    const obj = { a: 1 }
    const enc = await encryptJson(obj)
    // Tamper last char in base64 (safe-ish for test)
    const bad = enc.ciphertext.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'))
    await expect(decryptJson<typeof obj>({ iv: enc.iv, ciphertext: bad })).rejects.toThrow()
  })
})


