import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText, type LanguageModel } from 'ai'
import type { ProviderId } from './providers'

export type PingResult = { ok: true; reply: string } | { ok: false; error: string }

export async function pingModel(
  providerId: ProviderId,
  key: string,
  modelId: string,
): Promise<PingResult> {
  try {
    const { text } = await generateText({
      model: buildModel(providerId, key.trim(), modelId.trim()),
      prompt: 'ping',
      maxOutputTokens: 16,
    })
    const reply = text.trim()
    return { ok: true, reply: reply === '' ? '(empty)' : reply }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

function buildModel(providerId: ProviderId, key: string, modelId: string): LanguageModel {
  switch (providerId) {
    case 'openai':
      return createOpenAI({ apiKey: key })(modelId)
    case 'anthropic':
      return createAnthropic({
        apiKey: key,
        headers: { 'anthropic-dangerous-direct-browser-access': 'true' },
      })(modelId)
    case 'openrouter':
      return createOpenRouter({ apiKey: key })(modelId)
  }
}
