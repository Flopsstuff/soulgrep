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

const { generateSummary } = await import('./generateSummary')

const fragments = [
  { chunkId: 'c000001', signals: 'high openness, seeks validation' },
  { chunkId: 'c000002', signals: 'introversion pattern, avoids conflict' },
]

describe('generateSummary', () => {
  beforeEach(() => {
    generateText.mockReset()
  })

  it('returns ok:false immediately when fragments array is empty', async () => {
    const result = await generateSummary({
      providerId: 'openai',
      key: 'sk-1',
      modelId: 'gpt-5',
      side: 'outgoing',
      fragments: [],
    })
    expect(result).toEqual({ ok: false, error: 'no fragments to summarize' })
    expect(generateText).not.toHaveBeenCalled()
  })

  it('returns ok:true with trimmed summary on success', async () => {
    generateText.mockResolvedValueOnce({ text: '  Portrait: INFP type  ', finishReason: 'stop' })
    const result = await generateSummary({
      providerId: 'openai',
      key: 'sk-1',
      modelId: 'gpt-5',
      side: 'outgoing',
      fragments,
    })
    expect(result).toEqual({ ok: true, summary: 'Portrait: INFP type' })
  })

  it('returns ok:false with descriptive error when generateText returns empty text', async () => {
    generateText.mockResolvedValueOnce({ text: '   ', finishReason: 'stop', usage: {} })
    const result = await generateSummary({
      providerId: 'anthropic',
      key: 'sk-ant',
      modelId: 'claude-sonnet-4-6',
      side: 'incoming',
      fragments,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('empty text response')
  })

  it('returns ok:false with the error message when generateText throws', async () => {
    generateText.mockRejectedValueOnce(new Error('network error'))
    const result = await generateSummary({
      providerId: 'openrouter',
      key: 'sk-or',
      modelId: 'anthropic/claude-sonnet-4-6',
      side: 'outgoing',
      fragments,
    })
    expect(result).toEqual({ ok: false, error: 'network error' })
  })

  it('includes all fragment chunk ids and signals in the prompt', async () => {
    generateText.mockResolvedValueOnce({ text: 'portrait result', finishReason: 'stop' })
    await generateSummary({
      providerId: 'openai',
      key: 'sk-1',
      modelId: 'gpt-5',
      side: 'outgoing',
      fragments,
    })
    const prompt = generateText.mock.calls[0][0].prompt as string
    expect(prompt).toContain('c000001')
    expect(prompt).toContain('high openness')
    expect(prompt).toContain('c000002')
    expect(prompt).toContain('introversion pattern')
  })

  it('forwards the abort signal to generateText', async () => {
    const controller = new AbortController()
    generateText.mockResolvedValueOnce({ text: 'portrait', finishReason: 'stop' })
    await generateSummary({
      providerId: 'openai',
      key: 'sk-1',
      modelId: 'gpt-5',
      side: 'outgoing',
      fragments,
      signal: controller.signal,
    })
    expect(generateText.mock.calls[0][0].abortSignal).toBe(controller.signal)
  })

  it('mentions fragment count in the user prompt header', async () => {
    generateText.mockResolvedValueOnce({ text: 'portrait', finishReason: 'stop' })
    await generateSummary({
      providerId: 'openai',
      key: 'sk-1',
      modelId: 'gpt-5',
      side: 'outgoing',
      fragments,
    })
    const prompt = generateText.mock.calls[0][0].prompt as string
    expect(prompt).toContain(`${fragments.length} chat fragment`)
  })
})
