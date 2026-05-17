import type { CorpusRequest, CorpusResponse } from '../workers/corpus.worker.ts'
import CorpusWorker from '../workers/corpus.worker.ts?worker'
import type { BuildPersonaCorpusOptions, PersonaCorpusChunk } from './persona-corpus.ts'

export async function runCorpusInWorker(
  fileText: string,
  options: BuildPersonaCorpusOptions,
): Promise<PersonaCorpusChunk[]> {
  const worker = new CorpusWorker()
  try {
    return await new Promise<PersonaCorpusChunk[]>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<CorpusResponse>) => {
        const data = event.data
        if (data.type === 'ok') {
          resolve(data.chunks)
        } else {
          reject(new Error(data.message))
        }
      }
      worker.onerror = (event) => {
        reject(new Error(event.message || 'Worker error'))
      }
      const request: CorpusRequest = { fileText, options }
      worker.postMessage(request)
    })
  } finally {
    worker.terminate()
  }
}
