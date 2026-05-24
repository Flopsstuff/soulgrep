import { beforeEach, describe, expect, it, vi } from 'vitest'

const createAnthropicSpy = vi.fn()
const createOpenAISpy = vi.fn()
const createOpenRouterSpy = vi.fn()

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: (...args: unknown[]) => {
    createAnthropicSpy(...args)
    const [config] = args as [{ apiKey: string; headers?: Record<string, string> }]
    return (modelId: string) => ({ _provider: 'anthropic', modelId, _headers: config.headers })
  },
}))

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: (...args: unknown[]) => {
    createOpenAISpy(...args)
    return (modelId: string) => ({ _provider: 'openai', modelId })
  },
}))

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: (...args: unknown[]) => {
    createOpenRouterSpy(...args)
    return (modelId: string) => ({ _provider: 'openrouter', modelId })
  },
}))

const { buildModel } = await import('./buildModel')

type MockModel = { _provider: string; modelId: string; _headers?: Record<string, string> }

describe('buildModel', () => {
  beforeEach(() => {
    createAnthropicSpy.mockReset()
    createOpenAISpy.mockReset()
    createOpenRouterSpy.mockReset()
  })

  it('creates an openai model with the given model id', () => {
    const model = buildModel('openai', 'sk-1', 'gpt-5') as MockModel
    expect(model._provider).toBe('openai')
    expect(model.modelId).toBe('gpt-5')
    expect(createOpenAISpy).toHaveBeenCalledWith({ apiKey: 'sk-1' })
  })

  it('creates an anthropic model with browser-access header', () => {
    const model = buildModel('anthropic', 'sk-ant', 'claude-sonnet-4-6') as MockModel
    expect(model._provider).toBe('anthropic')
    expect(model.modelId).toBe('claude-sonnet-4-6')
    expect(model._headers).toEqual({
      'anthropic-dangerous-direct-browser-access': 'true',
    })
  })

  it('strips the -1m suffix and adds the beta header for long-context anthropic', () => {
    const model = buildModel('anthropic', 'sk-ant', 'claude-sonnet-4-6-1m') as MockModel
    expect(model.modelId).toBe('claude-sonnet-4-6')
    expect(model._headers).toEqual({
      'anthropic-dangerous-direct-browser-access': 'true',
      'anthropic-beta': 'context-1m-2025-08-07',
    })
  })

  it('does not add the beta header for non-1m anthropic models', () => {
    const model = buildModel('anthropic', 'sk-ant', 'claude-opus-4-7') as MockModel
    expect(model._headers).not.toHaveProperty('anthropic-beta')
  })

  it('creates an openrouter model with the given model id', () => {
    const model = buildModel('openrouter', 'sk-or', 'anthropic/claude-sonnet-4-6') as MockModel
    expect(model._provider).toBe('openrouter')
    expect(model.modelId).toBe('anthropic/claude-sonnet-4-6')
    expect(createOpenRouterSpy).toHaveBeenCalledWith({ apiKey: 'sk-or' })
  })
})
