import { PROVIDERS, type ProviderId } from './providers'

export type TestResult = { ok: true } | { ok: false; error: string }

export async function testProviderKey(id: ProviderId, key: string): Promise<TestResult> {
  const trimmed = key.trim()
  if (trimmed === '') return { ok: false, error: 'Key is empty' }

  const provider = PROVIDERS[id]
  try {
    const res = await fetch(provider.testUrl, {
      method: 'GET',
      headers: provider.buildHeaders(trimmed),
    })
    if (res.ok) return { ok: true }
    const body = await res.text().catch(() => '')
    const snippet = body.slice(0, 200).trim()
    return {
      ok: false,
      error: `HTTP ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`,
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
