import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearKey,
  getActiveProvider,
  getKey,
  getModel,
  hasActiveSelection,
  hasAnyKey,
  listKeys,
  setActiveProvider,
  setKey,
  setModel,
} from './keys'
import { PROVIDERS } from './providers'

describe('keys lib', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns empty string for missing key', () => {
    expect(getKey('openai')).toBe('')
  })

  it('stores and retrieves a key', () => {
    setKey('openai', 'sk-test')
    expect(getKey('openai')).toBe('sk-test')
  })

  it('trims whitespace on save', () => {
    setKey('anthropic', '  sk-ant  ')
    expect(getKey('anthropic')).toBe('sk-ant')
  })

  it('removes the key when set to an empty string', () => {
    setKey('openai', 'sk-test')
    setKey('openai', '   ')
    expect(getKey('openai')).toBe('')
  })

  it('clearKey removes the value', () => {
    setKey('openrouter', 'sk-or-1')
    clearKey('openrouter')
    expect(getKey('openrouter')).toBe('')
  })

  it('hasAnyKey reflects state across providers', () => {
    expect(hasAnyKey()).toBe(false)
    setKey('openrouter', 'sk-or-1')
    expect(hasAnyKey()).toBe(true)
    clearKey('openrouter')
    expect(hasAnyKey()).toBe(false)
  })

  it('listKeys returns a record of all providers', () => {
    setKey('openai', 'a')
    setKey('anthropic', 'b')
    const all = listKeys()
    expect(all).toEqual({ openai: 'a', anthropic: 'b', openrouter: '' })
  })
})

describe('model storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns provider.defaultModel when nothing is stored', () => {
    expect(getModel('openai')).toBe(PROVIDERS.openai.defaultModel)
    expect(getModel('anthropic')).toBe(PROVIDERS.anthropic.defaultModel)
    expect(getModel('openrouter')).toBe(PROVIDERS.openrouter.defaultModel)
  })

  it('persists a chosen model and reads it back', () => {
    setModel('openai', 'gpt-5')
    expect(getModel('openai')).toBe('gpt-5')
  })

  it('setModel with empty string falls back to default', () => {
    setModel('openai', 'gpt-5')
    setModel('openai', '   ')
    expect(getModel('openai')).toBe(PROVIDERS.openai.defaultModel)
  })
})

describe('active provider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('is null when no provider has a key', () => {
    expect(getActiveProvider()).toBeNull()
    expect(hasActiveSelection()).toBe(false)
  })

  it('auto-activates the first provider whose key is set', () => {
    setKey('anthropic', 'sk-ant')
    expect(getActiveProvider()).toBe('anthropic')
    expect(hasActiveSelection()).toBe(true)
  })

  it('does not override the active provider when another key is added later', () => {
    setKey('openai', 'sk-1')
    setKey('anthropic', 'sk-2')
    expect(getActiveProvider()).toBe('openai')
  })

  it('falls back to another keyed provider when the active one is cleared', () => {
    setKey('openai', 'sk-1')
    setKey('anthropic', 'sk-2')
    clearKey('openai')
    expect(getActiveProvider()).toBe('anthropic')
  })

  it('becomes null when the last keyed provider is cleared', () => {
    setKey('openai', 'sk-1')
    clearKey('openai')
    expect(getActiveProvider()).toBeNull()
    expect(hasActiveSelection()).toBe(false)
  })

  it('clearKey also wipes the stored model for that provider', () => {
    setKey('openai', 'sk-1')
    setModel('openai', 'gpt-5')
    clearKey('openai')
    expect(getModel('openai')).toBe(PROVIDERS.openai.defaultModel)
  })

  it('setActiveProvider lets the user override the auto-pick', () => {
    setKey('openai', 'sk-1')
    setKey('anthropic', 'sk-2')
    setActiveProvider('anthropic')
    expect(getActiveProvider()).toBe('anthropic')
    expect(hasActiveSelection()).toBe(true)
  })

  it('hasActiveSelection is false when active provider has no key', () => {
    setActiveProvider('openai')
    expect(hasActiveSelection()).toBe(false)
  })
})
