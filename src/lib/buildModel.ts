import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import type { ProviderId } from './providers'

export function buildModel(providerId: ProviderId, key: string, modelId: string): LanguageModel {
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
