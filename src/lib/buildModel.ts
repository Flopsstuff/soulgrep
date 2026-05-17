import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import type { ProviderId } from './providers'

export function buildModel(providerId: ProviderId, key: string, modelId: string): LanguageModel {
  switch (providerId) {
    case 'openai':
      return createOpenAI({ apiKey: key })(modelId)
    case 'anthropic': {
      const longContext = modelId.endsWith('-1m')
      const resolvedModelId = longContext ? modelId.slice(0, -'-1m'.length) : modelId
      const headers: Record<string, string> = {
        'anthropic-dangerous-direct-browser-access': 'true',
      }
      if (longContext) headers['anthropic-beta'] = 'context-1m-2025-08-07'
      return createAnthropic({ apiKey: key, headers })(resolvedModelId)
    }
    case 'openrouter':
      return createOpenRouter({ apiKey: key })(modelId)
  }
}
