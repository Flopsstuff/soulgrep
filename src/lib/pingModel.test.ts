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

const { pingModel } = await import('./pingModel')

describe('pingModel', () => {
  beforeEach(() => {
    generateText.mockReset()
  })

  it('returns the reply on success', async () => {
    generateText.mockResolvedValueOnce({ text: 'pong' })
    const result = await pingModel('openai', 'sk-1', 'gpt-5-mini')
    expect(result).toEqual({ ok: true, reply: 'pong' })
  })

  it('trims the reply and falls back to (empty) when blank', async () => {
    generateText.mockResolvedValueOnce({ text: '   ' })
    const result = await pingModel('anthropic', 'sk-ant', 'claude-sonnet-4-6')
    expect(result).toEqual({ ok: true, reply: '(empty)' })
  })

  it('returns the error message when generateText throws', async () => {
    generateText.mockRejectedValueOnce(new Error('rate limited'))
    const result = await pingModel('openrouter', 'sk-or', 'anthropic/claude-sonnet-4-6')
    expect(result).toEqual({ ok: false, error: 'rate limited' })
  })

  it('passes the right model id to generateText for each provider', async () => {
    generateText.mockResolvedValue({ text: 'pong' })

    await pingModel('openai', 'sk-1', 'gpt-5')
    expect(generateText.mock.calls[0][0].model).toEqual({ provider: 'openai', modelId: 'gpt-5' })

    await pingModel('anthropic', 'sk-2', 'claude-opus-4-7')
    expect(generateText.mock.calls[1][0].model).toEqual({
      provider: 'anthropic',
      modelId: 'claude-opus-4-7',
    })

    await pingModel('openrouter', 'sk-3', 'google/gemini-2.5-pro')
    expect(generateText.mock.calls[2][0].model).toEqual({
      provider: 'openrouter',
      modelId: 'google/gemini-2.5-pro',
    })
  })
})
