/// <reference lib="webworker" />
import { type BuildPersonaCorpusOptions, buildPersonaCorpus } from '../lib/persona-corpus.ts'

declare const self: DedicatedWorkerGlobalScope

export type CorpusRequest = {
  fileText: string
  options: BuildPersonaCorpusOptions
}

export type CorpusResponse =
  | { type: 'ok'; chunks: ReturnType<typeof buildPersonaCorpus> }
  | { type: 'error'; message: string }

self.onmessage = (event: MessageEvent<CorpusRequest>) => {
  try {
    const raw = JSON.parse(event.data.fileText)
    const chunks = buildPersonaCorpus(raw, event.data.options)
    const response: CorpusResponse = { type: 'ok', chunks }
    self.postMessage(response)
  } catch (error) {
    const response: CorpusResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    }
    self.postMessage(response)
  }
}
