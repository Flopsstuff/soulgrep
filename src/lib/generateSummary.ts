import { generateText } from 'ai'
import { buildModel } from './buildModel'
import type { Side } from './persona-corpus'
import { getSummarySystemPrompt } from './prompts'
import type { ProviderId } from './providers'

export type SummaryResult = { ok: true; summary: string } | { ok: false; error: string }

export type SummaryFragment = {
  chunkId: string
  signals: string
}

export type GenerateSummaryArgs = {
  providerId: ProviderId
  key: string
  modelId: string
  side: Side
  fragments: SummaryFragment[]
  signal?: AbortSignal
}

export async function generateSummary(args: GenerateSummaryArgs): Promise<SummaryResult> {
  const { providerId, key, modelId, side, fragments, signal } = args
  if (fragments.length === 0) {
    return { ok: false, error: 'no fragments to summarize' }
  }
  try {
    const result = await generateText({
      model: buildModel(providerId, key.trim(), modelId.trim()),
      system: getSummarySystemPrompt(side),
      prompt: buildUserPrompt(fragments),
      maxOutputTokens: 16384,
      abortSignal: signal,
    })
    const summary = result.text.trim()
    if (summary !== '') {
      return { ok: true, summary }
    }
    return { ok: false, error: describeEmpty(result) }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

function buildUserPrompt(fragments: SummaryFragment[]): string {
  const header = `Below are extracted behavioral signals from ${fragments.length} chat fragment(s), in chronological order. Synthesize them into the portrait described in your instructions.\n\n`
  const body = fragments.map((f) => `## fragment ${f.chunkId}\n${f.signals}`).join('\n\n---\n\n')
  return `${header}${body}`
}

function describeEmpty(result: Awaited<ReturnType<typeof generateText>>): string {
  const parts: string[] = ['empty text response']
  if (result.finishReason) parts.push(`finishReason=${result.finishReason}`)
  const usage = result.usage
  if (usage) {
    const out = usage.outputTokens ?? usage.totalTokens
    const reasoning = usage.reasoningTokens
    if (out !== undefined) parts.push(`outputTokens=${out}`)
    if (reasoning !== undefined) parts.push(`reasoningTokens=${reasoning}`)
  }
  if (result.finishReason === 'length') {
    parts.push('— hit max output tokens, try a larger limit or non-reasoning model')
  }
  return parts.join(' · ')
}
