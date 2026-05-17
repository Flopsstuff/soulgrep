export type ProviderId = 'openai' | 'anthropic' | 'openrouter'

export type Provider = {
  id: ProviderId
  label: string
  testUrl: string
  buildHeaders: (key: string) => Record<string, string>
  docsUrl: string
  keyHint: string
  models: readonly string[]
  defaultModel: string
}

export const PROVIDERS: Record<ProviderId, Provider> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    testUrl: 'https://api.openai.com/v1/models',
    buildHeaders: (key) => ({ Authorization: `Bearer ${key}` }),
    docsUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'sk-...',
    models: [
      'gpt-5.5-pro',
      'gpt-5.5',
      'gpt-5.4-pro',
      'gpt-5.4',
      'gpt-5.4-mini',
      'gpt-5.4-nano',
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
    ],
    defaultModel: 'gpt-5-mini',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    testUrl: 'https://api.anthropic.com/v1/models',
    buildHeaders: (key) => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    docsUrl: 'https://console.anthropic.com/settings/keys',
    keyHint: 'sk-ant-...',
    models: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
    defaultModel: 'claude-sonnet-4-6',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    testUrl: 'https://openrouter.ai/api/v1/key',
    buildHeaders: (key) => ({ Authorization: `Bearer ${key}` }),
    docsUrl: 'https://openrouter.ai/settings/keys',
    keyHint: 'sk-or-...',
    models: [
      'openai/gpt-5',
      'anthropic/claude-sonnet-4-6',
      'google/gemini-2.5-pro',
      'meta-llama/llama-3.3-70b-instruct',
    ],
    defaultModel: 'anthropic/claude-sonnet-4-6',
  },
}

export const PROVIDER_IDS: ProviderId[] = ['openai', 'anthropic', 'openrouter']
