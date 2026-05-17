import { useCallback, useSyncExternalStore } from 'react'

const CHANGE_EVENT = 'soulgrep:prompts:changed'
const PSYCHOTYPE_PROMPT_KEY = 'soulgrep:prompt:psychotype:custom'

export const PSYCHOTYPE_PROMPT_VERSION = 'v1'

export const DEFAULT_PSYCHOTYPE_SYSTEM_PROMPT = `You are an expert psycholinguistic analyst.

Your task is to infer the target speaker's communication psychotype from chat messages.

Rules:
- Focus only on textual evidence from the corpus
- Avoid clinical diagnosis or medical claims
- Distinguish stable communication traits from one-off reactions
- Cite representative behavioral patterns, not isolated quotes
- Return concise, structured output with confidence notes`

export const SAMPLE_PSYCHOTYPE_OVERRIDE_PROMPT = `You are a strict communication profiler.

Analyze only the target speaker messages and infer:
1) Communication style archetype
2) Emotional regulation patterns
3) Conflict behavior strategy
4) Attachment/relational signals (non-clinical)
5) Confidence level (low/medium/high) with uncertainty reasons

Constraints:
- Ground every claim in recurring language patterns
- Prefer "insufficient evidence" over overconfident claims
- Keep output under 300 words`

function emitChange(): void {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

export function getPsychotypePromptOverride(): string {
  return localStorage.getItem(PSYCHOTYPE_PROMPT_KEY) ?? ''
}

export function setPsychotypePromptOverride(prompt: string): void {
  const next = prompt.trim()
  if (next === '') {
    localStorage.removeItem(PSYCHOTYPE_PROMPT_KEY)
  } else {
    localStorage.setItem(PSYCHOTYPE_PROMPT_KEY, next)
  }
  emitChange()
}

export function clearPsychotypePromptOverride(): void {
  localStorage.removeItem(PSYCHOTYPE_PROMPT_KEY)
  emitChange()
}

export function seedSamplePsychotypePromptOverride(): void {
  localStorage.setItem(PSYCHOTYPE_PROMPT_KEY, SAMPLE_PSYCHOTYPE_OVERRIDE_PROMPT)
  emitChange()
}

export function getPsychotypeSystemPrompt(): string {
  const override = getPsychotypePromptOverride().trim()
  return override === '' ? DEFAULT_PSYCHOTYPE_SYSTEM_PROMPT : override
}

export function getPsychotypePromptSource(): 'default' | 'custom' {
  return getPsychotypePromptOverride().trim() === '' ? 'default' : 'custom'
}

export function usePsychotypePrompt(): [string, (prompt: string) => void, () => void] {
  const value = useSyncExternalStore(
    subscribe,
    getPsychotypeSystemPrompt,
    () => DEFAULT_PSYCHOTYPE_SYSTEM_PROMPT,
  )
  const set = useCallback((next: string) => setPsychotypePromptOverride(next), [])
  const clear = useCallback(() => clearPsychotypePromptOverride(), [])
  return [value, set, clear]
}
