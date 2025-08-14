import { generateKeyFromEnv } from '../lib/crypto'

describe('env guard for encryption key', () => {
  const prev = process.env.ANALYSIS_ENC_KEY
  afterEach(() => {
    if (prev == null) delete process.env.ANALYSIS_ENC_KEY
    else process.env.ANALYSIS_ENC_KEY = prev
  })

  it('throws when ANALYSIS_ENC_KEY is missing', async () => {
    delete process.env.ANALYSIS_ENC_KEY
    await expect(generateKeyFromEnv()).rejects.toThrow()
  })
})


