import { useCallback, useSyncExternalStore } from 'react'
import { PROVIDER_IDS, PROVIDERS, type ProviderId } from './providers'

const KEY_PREFIX = 'soulgrep:keys:'
const MODEL_PREFIX = 'soulgrep:model:'
const ACTIVE_PROVIDER_KEY = 'soulgrep:active-provider'
const CHANGE_EVENT = 'soulgrep:keys:changed'

const storageKey = (id: ProviderId) => `${KEY_PREFIX}${id}`
const modelStorageKey = (id: ProviderId) => `${MODEL_PREFIX}${id}`

function isProviderId(value: string | null): value is ProviderId {
  return value !== null && (PROVIDER_IDS as string[]).includes(value)
}

function emitChange(): void {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function getKey(id: ProviderId): string {
  return localStorage.getItem(storageKey(id)) ?? ''
}

export function setKey(id: ProviderId, value: string): void {
  const trimmed = value.trim()
  if (trimmed === '') {
    clearKey(id)
    return
  }

  localStorage.setItem(storageKey(id), trimmed)
  if (rawActiveProvider() === null) {
    localStorage.setItem(ACTIVE_PROVIDER_KEY, id)
  }
  emitChange()
}

export function clearKey(id: ProviderId): void {
  localStorage.removeItem(storageKey(id))
  localStorage.removeItem(modelStorageKey(id))

  if (rawActiveProvider() === id) {
    const fallback = PROVIDER_IDS.find((other) => other !== id && getKey(other) !== '')
    if (fallback) {
      localStorage.setItem(ACTIVE_PROVIDER_KEY, fallback)
    } else {
      localStorage.removeItem(ACTIVE_PROVIDER_KEY)
    }
  }

  emitChange()
}

export function listKeys(): Record<ProviderId, string> {
  return Object.fromEntries(PROVIDER_IDS.map((id) => [id, getKey(id)])) as Record<
    ProviderId,
    string
  >
}

export function hasAnyKey(): boolean {
  return PROVIDER_IDS.some((id) => getKey(id) !== '')
}

export function getModel(id: ProviderId): string {
  const stored = localStorage.getItem(modelStorageKey(id))
  if (stored && stored.trim() !== '') {
    return stored
  }
  return PROVIDERS[id].defaultModel
}

export function setModel(id: ProviderId, model: string): void {
  const trimmed = model.trim()
  if (trimmed === '') {
    localStorage.removeItem(modelStorageKey(id))
  } else {
    localStorage.setItem(modelStorageKey(id), trimmed)
  }
  emitChange()
}

function rawActiveProvider(): ProviderId | null {
  const raw = localStorage.getItem(ACTIVE_PROVIDER_KEY)
  return isProviderId(raw) ? raw : null
}

export function getActiveProvider(): ProviderId | null {
  return rawActiveProvider()
}

export function setActiveProvider(id: ProviderId | null): void {
  if (id === null) {
    localStorage.removeItem(ACTIVE_PROVIDER_KEY)
  } else {
    localStorage.setItem(ACTIVE_PROVIDER_KEY, id)
  }
  emitChange()
}

export function hasActiveSelection(): boolean {
  const active = getActiveProvider()
  return active !== null && getKey(active) !== ''
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

export function useStoredKey(id: ProviderId): [string, (value: string) => void, () => void] {
  const value = useSyncExternalStore(
    subscribe,
    useCallback(() => getKey(id), [id]),
    () => '',
  )
  const set = useCallback((next: string) => setKey(id, next), [id])
  const clear = useCallback(() => clearKey(id), [id])
  return [value, set, clear]
}

export function useHasAnyKey(): boolean {
  return useSyncExternalStore(subscribe, hasAnyKey, () => false)
}

export function useStoredModel(id: ProviderId): [string, (model: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    useCallback(() => getModel(id), [id]),
    () => PROVIDERS[id].defaultModel,
  )
  const set = useCallback((next: string) => setModel(id, next), [id])
  return [value, set]
}

export function useActiveProvider(): [ProviderId | null, (id: ProviderId | null) => void] {
  const value = useSyncExternalStore(subscribe, getActiveProvider, () => null)
  return [value, setActiveProvider]
}

export function useHasActiveSelection(): boolean {
  return useSyncExternalStore(subscribe, hasActiveSelection, () => false)
}
