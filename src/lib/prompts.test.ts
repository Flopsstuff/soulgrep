import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSignalsPromptOverride,
  DEFAULT_SIGNALS_SYSTEM_TEMPLATE,
  getSignalsPromptOverride,
  getSignalsPromptSource,
  getSignalsPromptTemplate,
  getSignalsSystemPrompt,
  setSignalsPromptOverride,
} from './prompts'

describe('signals prompt', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default template when override is missing', () => {
    expect(getSignalsPromptTemplate()).toBe(DEFAULT_SIGNALS_SYSTEM_TEMPLATE)
    expect(getSignalsPromptSource()).toBe('default')
  })

  it('uses override when provided', () => {
    setSignalsPromptOverride('Custom signals template')
    expect(getSignalsPromptOverride()).toBe('Custom signals template')
    expect(getSignalsPromptTemplate()).toBe('Custom signals template')
    expect(getSignalsPromptSource()).toBe('custom')
  })

  it('treats whitespace override as empty', () => {
    setSignalsPromptOverride('   ')
    expect(getSignalsPromptOverride()).toBe('')
    expect(getSignalsPromptTemplate()).toBe(DEFAULT_SIGNALS_SYSTEM_TEMPLATE)
    expect(getSignalsPromptSource()).toBe('default')
  })

  it('can clear override explicitly', () => {
    setSignalsPromptOverride('Custom signals template')
    clearSignalsPromptOverride()
    expect(getSignalsPromptOverride()).toBe('')
    expect(getSignalsPromptSource()).toBe('default')
  })

  it('substitutes side-specific markers and labels into the template', () => {
    setSignalsPromptOverride(
      'subject={{SUBJECT_LABEL}} marker={{SUBJECT_MARKER}} context={{CONTEXT_LABEL}} ctxMarker={{CONTEXT_MARKER}}',
    )
    expect(getSignalsSystemPrompt('outgoing')).toBe(
      'subject=outgoing marker==> context=incoming ctxMarker=<=',
    )
    expect(getSignalsSystemPrompt('incoming')).toBe(
      'subject=incoming marker=<= context=outgoing ctxMarker==>',
    )
  })
})
