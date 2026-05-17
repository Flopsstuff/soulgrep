import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Spinner } from '../components/Spinner.tsx'
import { putSession } from '../lib/analysisStore.ts'
import type { BuildPersonaCorpusOptions, PersonaCorpusChunk } from '../lib/persona-corpus.ts'
import { runCorpusInWorker } from '../lib/runCorpusInWorker.ts'

const DEFAULT_OPTIONS: BuildPersonaCorpusOptions = {
  minCharsPerChunk: 4000,
  maxCharsPerChunk: 100_000,
  maxWordsPerChunk: 3_000,
  maxMessagesPerChunk: 1000,
  dropShortMessages: false,
  minMessageLength: 3,
  speakerFormat: 'symbols',
}

type State =
  | { status: 'idle' }
  | { status: 'parsing'; file: File }
  | { status: 'ready'; file: File; chunks: PersonaCorpusChunk[] }
  | { status: 'error'; file: File; error: string }

export default function Import() {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const file = state.status !== 'idle' ? state.file : null

  const onPick = (next: File) => {
    if (!next.name.toLowerCase().endsWith('.json')) {
      setState({ status: 'error', file: next, error: 'Pick a .json file (Telegram export)' })
      return
    }
    setState({ status: 'parsing', file: next })
    next
      .text()
      .then((text) => runCorpusInWorker(text, DEFAULT_OPTIONS))
      .then((chunks) => {
        setState({ status: 'ready', file: next, chunks })
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        setState({ status: 'error', file: next, error: message })
      })
  }

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-semibold text-3xl tracking-tight">Import a chat</h1>
        <p className="text-neutral-400 text-sm">
          soulgrep works on a Telegram Desktop JSON export of a single chat. Everything stays in
          your browser — no upload to any server.
        </p>
      </header>

      <Instructions />

      <Dropzone
        dragOver={dragOver}
        onDragStateChange={setDragOver}
        onPick={onPick}
        onPickClick={() => fileInputRef.current?.click()}
        file={file}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.target.value = ''
        }}
      />

      {state.status === 'parsing' && (
        <p className="flex items-center gap-2 text-neutral-400 text-sm">
          <Spinner size="sm" className="text-neutral-300" />
          <span>Parsing {state.file.name}…</span>
        </p>
      )}

      {state.status === 'error' && (
        <div className="rounded-md border border-red-900/60 bg-red-950/30 p-4">
          <p className="font-medium text-red-300 text-sm">Failed to process file</p>
          <p className="mt-1 break-all font-mono text-red-400 text-xs">{state.error}</p>
        </div>
      )}

      {state.status === 'ready' && <Results file={state.file} chunks={state.chunks} />}

      <footer className="flex items-center justify-between border-neutral-800 border-t pt-6">
        <Link to="/" className="text-neutral-500 text-sm hover:text-neutral-300">
          ← Home
        </Link>
      </footer>
    </section>
  )
}

function Instructions() {
  return (
    <details className="group rounded-md border border-neutral-800 bg-neutral-900/40">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-neutral-200 text-sm">
        <span>How to export from Telegram Desktop</span>
        <span className="text-neutral-500 text-xs group-open:hidden">show steps</span>
        <span className="hidden text-neutral-500 text-xs group-open:inline">hide</span>
      </summary>
      <div className="space-y-3 border-neutral-800 border-t px-4 py-4">
        <ol className="space-y-2 text-neutral-300 text-sm">
          <li>
            <span className="mr-2 text-neutral-500">1.</span>
            Open <strong>Telegram Desktop</strong> (mobile clients cannot export).
          </li>
          <li>
            <span className="mr-2 text-neutral-500">2.</span>
            Open the chat you want to analyze.
          </li>
          <li>
            <span className="mr-2 text-neutral-500">3.</span>
            Click the <code className="text-neutral-100">⋯</code> menu →{' '}
            <strong>Export chat history</strong>.
          </li>
          <li>
            <span className="mr-2 text-neutral-500">4.</span>
            Under <em>Format</em>, choose <strong>Machine-readable JSON</strong>. Disable photos /
            videos / stickers — only text is used.
          </li>
          <li>
            <span className="mr-2 text-neutral-500">5.</span>
            Save the export, then unzip — the file you need is{' '}
            <code className="text-neutral-100">result.json</code>.
          </li>
        </ol>
        <p className="text-neutral-500 text-xs">
          Tip: more text from the target speaker = a richer signal. Aim for at least a few thousand
          of their messages.
        </p>
      </div>
    </details>
  )
}

function Dropzone({
  dragOver,
  onDragStateChange,
  onPick,
  onPickClick,
  file,
}: {
  dragOver: boolean
  onDragStateChange: (over: boolean) => void
  onPick: (file: File) => void
  onPickClick: () => void
  file: File | null
}) {
  return (
    <button
      type="button"
      onClick={onPickClick}
      onDragOver={(e) => {
        e.preventDefault()
        onDragStateChange(true)
      }}
      onDragLeave={() => onDragStateChange(false)}
      onDrop={(e) => {
        e.preventDefault()
        onDragStateChange(false)
        const dropped = e.dataTransfer.files?.[0]
        if (dropped) onPick(dropped)
      }}
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
        dragOver
          ? 'border-neutral-400 bg-neutral-800/30'
          : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
      }`}
    >
      <span className="font-medium text-neutral-200 text-sm">
        {file ? file.name : 'Drop result.json or click to pick'}
      </span>
      {file && (
        <span className="text-neutral-500 text-xs">
          {formatBytes(file.size)} — re-pick to replace
        </span>
      )}
    </button>
  )
}

function Results({ file, chunks }: { file: File; chunks: PersonaCorpusChunk[] }) {
  const navigate = useNavigate()
  const stats = useMemo(() => summarize(chunks), [chunks])
  const downloadUrl = useMemo(() => {
    const body = chunks.map((c) => JSON.stringify(c)).join('\n')
    const blob = new Blob([body + (chunks.length > 0 ? '\n' : '')], {
      type: 'application/x-ndjson',
    })
    return URL.createObjectURL(blob)
  }, [chunks])

  const downloadName = `${file.name.replace(/\.json$/i, '')}.chunks.jsonl`

  const onAnalyze = () => {
    const sessionId = putSession(chunks)
    navigate('/import/analyze', { state: { sessionId } })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900/40 px-4 py-3">
        <p className="text-neutral-200 text-sm">
          <strong>{stats.chunks}</strong> chunks · <strong>{stats.messages}</strong> messages ·{' '}
          <strong>{stats.chars.toLocaleString()}</strong> chars ·{' '}
          <strong>{stats.words.toLocaleString()}</strong> words
        </p>
        <div className="flex items-center gap-2">
          <a
            href={downloadUrl}
            download={downloadName}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-neutral-100 text-xs hover:bg-neutral-700"
          >
            Download .jsonl
          </a>
          <button
            type="button"
            onClick={onAnalyze}
            disabled={chunks.length === 0}
            className="rounded-md border border-emerald-700 bg-emerald-800 px-3 py-1.5 text-emerald-50 text-xs hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Analyze →
          </button>
        </div>
      </div>

      {chunks.length === 0 ? (
        <p className="text-neutral-500 text-sm">No chunks produced — the chat may be too short.</p>
      ) : (
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-2">
          {chunks.map((chunk) => (
            <li
              key={chunk.chunk_id}
              className="rounded-md border border-neutral-800 bg-neutral-900/30"
            >
              <details>
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className="font-mono text-neutral-400">{chunk.chunk_id}</span>
                  <span className="text-neutral-500 text-xs">
                    {chunk.messages_count} msgs · {chunk.char_count.toLocaleString()} chars ·{' '}
                    {chunk.word_count.toLocaleString()} words
                  </span>
                </summary>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-neutral-800 border-t bg-neutral-950 px-4 py-3 font-mono text-neutral-300 text-xs">
                  {chunk.text}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function summarize(chunks: PersonaCorpusChunk[]) {
  return chunks.reduce(
    (acc, c) => ({
      chunks: acc.chunks + 1,
      messages: acc.messages + c.messages_count,
      chars: acc.chars + c.char_count,
      words: acc.words + c.word_count,
    }),
    { chunks: 0, messages: 0, chars: 0, words: 0 },
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
