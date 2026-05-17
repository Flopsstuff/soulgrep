import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearPsychotypePromptOverride,
  DEFAULT_PSYCHOTYPE_SYSTEM_PROMPT,
  getPsychotypePromptOverride,
  getPsychotypePromptSource,
  getPsychotypeSystemPrompt,
  SAMPLE_PSYCHOTYPE_OVERRIDE_PROMPT,
  seedSamplePsychotypePromptOverride,
  setPsychotypePromptOverride,
} from './prompts'

describe('prompts lib', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default prompt when override is missing', () => {
    expect(getPsychotypeSystemPrompt()).toBe(DEFAULT_PSYCHOTYPE_SYSTEM_PROMPT)
    expect(getPsychotypePromptSource()).toBe('default')
  })

  it('uses override when provided', () => {
    setPsychotypePromptOverride('Custom prompt')
    expect(getPsychotypePromptOverride()).toBe('Custom prompt')
    expect(getPsychotypeSystemPrompt()).toBe('Custom prompt')
    expect(getPsychotypePromptSource()).toBe('custom')
  })

  it('treats whitespace override as empty', () => {
    setPsychotypePromptOverride('   ')
    expect(getPsychotypePromptOverride()).toBe('')
    expect(getPsychotypeSystemPrompt()).toBe(DEFAULT_PSYCHOTYPE_SYSTEM_PROMPT)
    expect(getPsychotypePromptSource()).toBe('default')
  })

  it('can clear override explicitly', () => {
    setPsychotypePromptOverride('Custom prompt')
    clearPsychotypePromptOverride()
    expect(getPsychotypePromptOverride()).toBe('')
    expect(getPsychotypePromptSource()).toBe('default')
  })

  it('seeds sample override into localStorage', () => {
    seedSamplePsychotypePromptOverride()
    expect(getPsychotypePromptOverride()).toBe(SAMPLE_PSYCHOTYPE_OVERRIDE_PROMPT)
    expect(getPsychotypeSystemPrompt()).toBe(SAMPLE_PSYCHOTYPE_OVERRIDE_PROMPT)
    expect(getPsychotypePromptSource()).toBe('custom')
  })
})
