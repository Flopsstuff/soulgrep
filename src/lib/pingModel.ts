import { generateText } from 'ai'
import { buildModel } from './buildModel'
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
