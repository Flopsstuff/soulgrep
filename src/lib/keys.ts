import { useCallback, useSyncExternalStore } from 'react'
import { PROVIDER_IDS, type ProviderId } from './providers'

const PREFIX = 'soulgrep:keys:'
const CHANGE_EVENT = 'soulgrep:keys:changed'

const storageKey = (id: ProviderId) => `${PREFIX}${id}`

export function getKey(id: ProviderId): string {
  return localStorage.getItem(storageKey(id)) ?? ''
}

export function setKey(id: ProviderId, value: string): void {
  const trimmed = value.trim()
  if (trimmed === '') {
    localStorage.removeItem(storageKey(id))
  } else {
    localStorage.setItem(storageKey(id), trimmed)
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function clearKey(id: ProviderId): void {
  localStorage.removeItem(storageKey(id))
  window.dispatchEvent(new Event(CHANGE_EVENT))
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
