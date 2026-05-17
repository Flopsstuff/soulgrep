export type ProviderId = 'openai' | 'anthropic' | 'openrouter'

export type Provider = {
  id: ProviderId
  label: string
  testUrl: string
  buildHeaders: (key: string) => Record<string, string>
  docsUrl: string
  keyHint: string
}

export const PROVIDERS: Record<ProviderId, Provider> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    testUrl: 'https://api.openai.com/v1/models',
    buildHeaders: (key) => ({ Authorization: `Bearer ${key}` }),
    docsUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'sk-...',
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
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    testUrl: 'https://openrouter.ai/api/v1/key',
    buildHeaders: (key) => ({ Authorization: `Bearer ${key}` }),
    docsUrl: 'https://openrouter.ai/settings/keys',
    keyHint: 'sk-or-...',
  },
}

export const PROVIDER_IDS: ProviderId[] = ['openai', 'anthropic', 'openrouter']
