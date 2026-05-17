import { beforeEach, describe, expect, it } from 'vitest'
import { clearKey, getKey, hasAnyKey, listKeys, setKey } from './keys'

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
