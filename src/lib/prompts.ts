import { useCallback, useSyncExternalStore } from 'react'
import { SIDE_MARKERS, type Side } from './persona-corpus'

const CHANGE_EVENT = 'soulgrep:prompts:changed'
const PSYCHOTYPE_PROMPT_KEY = 'soulgrep:prompt:psychotype:custom'
const SIGNALS_PROMPT_KEY = 'soulgrep:prompt:signals:custom'

export const PSYCHOTYPE_PROMPT_VERSION = 'v1'
export const SIGNALS_PROMPT_VERSION = 'v1'

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

export const DEFAULT_SIGNALS_SYSTEM_TEMPLATE = `You extract behavioral and communication signals about the {{SUBJECT_LABEL}} speaker from a chunk of chat messages.

The corpus uses arrow markers at the start of each line:
- "{{SUBJECT_MARKER}}" lines are the SUBJECT (focus of analysis — the {{SUBJECT_LABEL}} side)
- "{{CONTEXT_MARKER}}" lines are CONTEXT (the {{CONTEXT_LABEL}} side — use only to interpret the subject's responses, do not profile)

Rules:
- Extract signals only from SUBJECT "{{SUBJECT_MARKER}}" lines; use context only for situational meaning
- Each signal must be grounded in observable patterns in this chunk
- Skip signals you cannot ground in the text — say nothing rather than guess
- No clinical or diagnostic claims (no DSM labels, no disorders)
- Prefer concrete, behavioral phrasing over abstract trait labels

Output format: one signal per line, no preamble, no summary:
- <signal>: <short evidence reference — a paraphrase or representative phrase>

If the chunk has no usable subject content, output a single line: "no signal"`

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

export function getSignalsPromptOverride(): string {
  return localStorage.getItem(SIGNALS_PROMPT_KEY) ?? ''
}

export function setSignalsPromptOverride(prompt: string): void {
  const next = prompt.trim()
  if (next === '') {
    localStorage.removeItem(SIGNALS_PROMPT_KEY)
  } else {
    localStorage.setItem(SIGNALS_PROMPT_KEY, next)
  }
  emitChange()
}

export function clearSignalsPromptOverride(): void {
  localStorage.removeItem(SIGNALS_PROMPT_KEY)
  emitChange()
}

export function getSignalsPromptTemplate(): string {
  const override = getSignalsPromptOverride().trim()
  return override === '' ? DEFAULT_SIGNALS_SYSTEM_TEMPLATE : override
}

export function getSignalsSystemPrompt(side: Side): string {
  const template = getSignalsPromptTemplate()
  const context: Side = side === 'outgoing' ? 'incoming' : 'outgoing'
  return template
    .replaceAll('{{SUBJECT_MARKER}}', SIDE_MARKERS[side])
    .replaceAll('{{CONTEXT_MARKER}}', SIDE_MARKERS[context])
    .replaceAll('{{SUBJECT_LABEL}}', side)
    .replaceAll('{{CONTEXT_LABEL}}', context)
}

export function getSignalsPromptSource(): 'default' | 'custom' {
  return getSignalsPromptOverride().trim() === '' ? 'default' : 'custom'
}

export function useSignalsPromptTemplate(): [string, (prompt: string) => void, () => void] {
  const value = useSyncExternalStore(
    subscribe,
    getSignalsPromptTemplate,
    () => DEFAULT_SIGNALS_SYSTEM_TEMPLATE,
  )
  const set = useCallback((next: string) => setSignalsPromptOverride(next), [])
  const clear = useCallback(() => clearSignalsPromptOverride(), [])
  return [value, set, clear]
}
