import { beforeEach, describe, expect, it, vi } from 'vitest'

const generateText = vi.fn()

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => generateText(...args),
}))

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: () => (modelId: string) => ({ provider: 'openai', modelId }),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: () => (modelId: string) => ({ provider: 'anthropic', modelId }),
}))

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: () => (modelId: string) => ({ provider: 'openrouter', modelId }),
}))

const { extractSignals } = await import('./extractSignals')

const chunk = {
  chunk_id: 'c000001',
  messages_count: 5,
  char_count: 100,
  word_count: 20,
  text: '=> hello world\n<= hi there',
}

describe('extractSignals', () => {
  beforeEach(() => {
    generateText.mockReset()
  })

  it('returns ok:true with trimmed signals on success', async () => {
    generateText.mockResolvedValueOnce({ text: '  MBTI: INFP\nhigh openness  ', finishReason: 'stop' })
    const result = await extractSignals({
      providerId: 'openai',
      key: 'sk-1',
      modelId: 'gpt-5',
      chunk,
      side: 'outgoing',
    })
    expect(result).toEqual({ ok: true, signals: 'MBTI: INFP\nhigh openness' })
  })

  it('returns ok:false with descriptive error when generateText returns empty text', async () => {
    generateText.mockResolvedValueOnce({ text: '   ', finishReason: 'stop', usage: {} })
    const result = await extractSignals({
      providerId: 'anthropic',
      key: 'sk-ant',
      modelId: 'claude-sonnet-4-6',
      chunk,
      side: 'incoming',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('empty text response')
  })

  it('returns ok:false with the error message when generateText throws', async () => {
    generateText.mockRejectedValueOnce(new Error('rate limited'))
    const result = await extractSignals({
      providerId: 'openrouter',
      key: 'sk-or',
      modelId: 'anthropic/claude-sonnet-4-6',
      chunk,
      side: 'outgoing',
    })
    expect(result).toEqual({ ok: false, error: 'rate limited' })
  })

  it('converts non-Error throws to a string error', async () => {
    generateText.mockRejectedValueOnce('bad string')
    const result = await extractSignals({
      providerId: 'openai',
      key: 'sk-1',
      modelId: 'gpt-5',
      chunk,
      side: 'outgoing',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('bad string')
  })

  it('passes the chunk text as the prompt to generateText', async () => {
    generateText.mockResolvedValueOnce({ text: 'some signals', finishReason: 'stop' })
    await extractSignals({ providerId: 'openai', key: 'sk-1', modelId: 'gpt-5', chunk, side: 'outgoing' })
    expect(generateText.mock.calls[0][0].prompt).toBe(chunk.text)
  })

  it('forwards the abort signal to generateText', async () => {
    const controller = new AbortController()
    generateText.mockResolvedValueOnce({ text: 'signals', finishReason: 'stop' })
    await extractSignals({
      providerId: 'openai',
      key: 'sk-1',
      modelId: 'gpt-5',
      chunk,
      side: 'outgoing',
      signal: controller.signal,
    })
    expect(generateText.mock.calls[0][0].abortSignal).toBe(controller.signal)
  })

  it('includes finishReason in the empty-response error', async () => {
    generateText.mockResolvedValueOnce({ text: '', finishReason: 'length', usage: {} })
    const result = await extractSignals({
      providerId: 'openai',
      key: 'sk-1',
      modelId: 'gpt-5',
      chunk,
      side: 'outgoing',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('finishReason=length')
      expect(result.error).toContain('hit max output tokens')
    }
  })
})
