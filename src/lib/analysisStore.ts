import type { PersonaCorpusChunk } from './persona-corpus'

const sessions = new Map<string, PersonaCorpusChunk[]>()

export function putSession(chunks: PersonaCorpusChunk[]): string {
  const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  sessions.set(id, chunks)
  return id
}

export function getSession(id: string): PersonaCorpusChunk[] | null {
  return sessions.get(id) ?? null
}

export function dropSession(id: string): void {
  sessions.delete(id)
}
