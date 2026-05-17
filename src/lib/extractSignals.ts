import { generateText } from 'ai'
import { buildModel } from './buildModel'
import type { PersonaCorpusChunk, Side } from './persona-corpus'
import { getSignalsSystemPrompt } from './prompts'
import type { ProviderId } from './providers'

export type SignalsResult = { ok: true; signals: string } | { ok: false; error: string }

export type ExtractSignalsArgs = {
  providerId: ProviderId
  key: string
  modelId: string
  chunk: PersonaCorpusChunk
  side: Side
  signal?: AbortSignal
}

export async function extractSignals(args: ExtractSignalsArgs): Promise<SignalsResult> {
  const { providerId, key, modelId, chunk, side, signal } = args
  try {
    const { text } = await generateText({
      model: buildModel(providerId, key.trim(), modelId.trim()),
      system: getSignalsSystemPrompt(side),
      prompt: chunk.text,
      maxOutputTokens: 2000,
      abortSignal: signal,
    })
    const signals = text.trim()
    return { ok: true, signals: signals === '' ? '(empty)' : signals }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
