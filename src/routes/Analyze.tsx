import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Spinner } from '../components/Spinner'
import { dropSession, getSession } from '../lib/analysisStore'
import { extractSignals } from '../lib/extractSignals'
import { generateSummary } from '../lib/generateSummary'
import { useActiveProvider, useStoredKey, useStoredModel } from '../lib/keys'
import { type PersonaCorpusChunk, SIDE_MARKERS, type Side } from '../lib/persona-corpus'
import { PROVIDERS, type ProviderId } from '../lib/providers'
import { runPool } from '../lib/runPool'

const CONCURRENCY = 10

const SIDE_LABEL: Record<Side, string> = {
  outgoing: 'outgoing (you)',
  incoming: 'incoming (them)',
}

type JobStatus = 'pending' | 'running' | 'done' | 'error'
type Job = {
  chunk: PersonaCorpusChunk
  status: JobStatus
  result?: string
  error?: string
}

type RunState = 'idle' | 'running' | 'done'

type SummaryState =
  | { status: 'idle' }
  | { status: 'running'; side: Side; fragmentCount: number }
  | { status: 'done'; side: Side; fragmentCount: number; summary: string }
  | { status: 'error'; side: Side; fragmentCount: number; error: string }

export default function Analyze() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeProvider] = useActiveProvider()

  const sessionId = (location.state as { sessionId?: string } | null)?.sessionId ?? null
  const chunks = useMemo(() => (sessionId ? getSession(sessionId) : null), [sessionId])

  useEffect(() => {
    if (!chunks) navigate('/import', { replace: true })
  }, [chunks, navigate])

  useEffect(() => {
    return () => {
      if (sessionId) dropSession(sessionId)
    }
  }, [sessionId])

  if (!chunks || !activeProvider) return null

  return <AnalyzeBody chunks={chunks} providerId={activeProvider} />
}

function AnalyzeBody({
  chunks,
  providerId,
}: {
  chunks: PersonaCorpusChunk[]
  providerId: ProviderId
}) {
  const [key] = useStoredKey(providerId)
  const [modelId] = useStoredModel(providerId)

  const [jobs, setJobs] = useState<Job[]>(() =>
    chunks.map((chunk) => ({ chunk, status: 'pending' as JobStatus })),
  )
  const [runState, setRunState] = useState<RunState>('idle')
  const [activeSide, setActiveSide] = useState<Side | null>(null)
  const [summary, setSummary] = useState<SummaryState>({ status: 'idle' })
  const abortRef = useRef<AbortController | null>(null)
  const summaryAbortRef = useRef<AbortController | null>(null)

  const runOne = useCallback(
    async (index: number, side: Side, signal?: AbortSignal) => {
      setJobs((prev) =>
        prev.map((j, i) =>
          i === index ? { ...j, status: 'running', result: undefined, error: undefined } : j,
        ),
      )
      const result = await extractSignals({
        providerId,
        key,
        modelId,
        chunk: chunks[index],
        side,
        signal,
      })
      setJobs((prev) =>
        prev.map((j, i) => {
          if (i !== index) return j
          return result.ok
            ? { ...j, status: 'done', result: result.signals }
            : { ...j, status: 'error', error: result.error }
        }),
      )
    },
    [providerId, key, modelId, chunks],
  )

  const onStart = useCallback(
    async (side: Side) => {
      if (key.trim() === '') return
      // Starting a new pool invalidates any previous summary — abort and reset.
      summaryAbortRef.current?.abort()
      summaryAbortRef.current = null
      setSummary({ status: 'idle' })
      const controller = new AbortController()
      abortRef.current = controller
      setActiveSide(side)
      setRunState('running')
      setJobs((prev) =>
        prev.map((j) => ({ ...j, status: 'pending', result: undefined, error: undefined })),
      )
      await runPool(chunks, (_chunk, i) => runOne(i, side, controller.signal), {
        concurrency: CONCURRENCY,
        signal: controller.signal,
      })
      abortRef.current = null
      setRunState('done')
    },
    [chunks, runOne, key],
  )

  const onCancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const onRetry = useCallback(
    (index: number) => {
      if (!activeSide) return
      void runOne(index, activeSide)
    },
    [runOne, activeSide],
  )

  const onSummary = useCallback(async () => {
    if (!activeSide || key.trim() === '') return
    const fragments = jobs
      .filter((j) => j.status === 'done' && j.result)
      .map((j) => ({ chunkId: j.chunk.chunk_id, signals: j.result as string }))
    if (fragments.length === 0) return
    const controller = new AbortController()
    summaryAbortRef.current = controller
    setSummary({ status: 'running', side: activeSide, fragmentCount: fragments.length })
    const result = await generateSummary({
      providerId,
      key,
      modelId,
      side: activeSide,
      fragments,
      signal: controller.signal,
    })
    summaryAbortRef.current = null
    setSummary(
      result.ok
        ? {
            status: 'done',
            side: activeSide,
            fragmentCount: fragments.length,
            summary: result.summary,
          }
        : {
            status: 'error',
            side: activeSide,
            fragmentCount: fragments.length,
            error: result.error,
          },
    )
  }, [activeSide, jobs, providerId, key, modelId])

  const onSummaryCancel = useCallback(() => {
    summaryAbortRef.current?.abort()
    summaryAbortRef.current = null
    setSummary({ status: 'idle' })
  }, [])

  const stats = useMemo(() => {
    let done = 0
    let error = 0
    let running = 0
    let pending = 0
    for (const j of jobs) {
      if (j.status === 'done') done++
      else if (j.status === 'error') error++
      else if (j.status === 'running') running++
      else pending++
    }
    return { done, error, running, pending, total: jobs.length }
  }, [jobs])

  const hasKey = key.trim() !== ''
  const isRunning = runState === 'running'

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-semibold text-3xl tracking-tight">Analyze chat</h1>
        <p className="text-neutral-400 text-sm">
          Extract behavioral signals from each chunk in parallel. Up to {CONCURRENCY} requests run
          at once. Stays in your browser — calls go straight from here to{' '}
          <span className="text-neutral-200">{PROVIDERS[providerId].label}</span>.
        </p>
      </header>

      <div className="rounded-md border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-sm">
            <p className="text-neutral-200">
              <span className="text-neutral-500">Provider:</span>{' '}
              <strong>{PROVIDERS[providerId].label}</strong>
              <span className="text-neutral-500"> · Model:</span>{' '}
              <strong className="font-mono">{modelId || '(none)'}</strong>
            </p>
            <p className="text-neutral-500 text-xs">
              {activeSide ? (
                <>
                  Analyzing <strong className="text-neutral-300">{SIDE_LABEL[activeSide]}</strong>{' '}
                  <span className="font-mono">({SIDE_MARKERS[activeSide]})</span> ·{' '}
                </>
              ) : (
                'Pick a side to analyze · '
              )}
              {stats.total} chunks · {stats.done} done · {stats.error} failed · {stats.running}{' '}
              running · {stats.pending} pending
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isRunning ? (
              <>
                <SideButton
                  side="outgoing"
                  activeSide={activeSide}
                  disabled={!hasKey || chunks.length === 0}
                  onClick={() => onStart('outgoing')}
                />
                <SideButton
                  side="incoming"
                  activeSide={activeSide}
                  disabled={!hasKey || chunks.length === 0}
                  onClick={() => onStart('incoming')}
                />
              </>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-neutral-100 text-xs hover:bg-neutral-700"
              >
                <Spinner size="xs" className="text-neutral-300" />
                Cancel {activeSide ? SIDE_LABEL[activeSide] : ''}
              </button>
            )}
            {summary.status === 'running' ? (
              <button
                type="button"
                onClick={onSummaryCancel}
                className="inline-flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-neutral-100 text-xs hover:bg-neutral-700"
              >
                <Spinner size="xs" className="text-neutral-300" />
                Cancel summary
              </button>
            ) : (
              <button
                type="button"
                onClick={onSummary}
                disabled={!hasKey || !activeSide || stats.done === 0 || isRunning}
                title={
                  !activeSide
                    ? 'Pick a side first'
                    : stats.done === 0
                      ? 'Need at least one finished chunk'
                      : isRunning
                        ? 'Wait for chunk analysis to finish'
                        : 'Synthesize a portrait from finished chunks'
                }
                className="rounded-md border border-emerald-700 bg-emerald-800 px-3 py-1.5 text-emerald-50 text-xs hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Run summary →
              </button>
            )}
          </div>
        </div>
        {!hasKey && (
          <p className="mt-2 text-amber-400 text-xs">
            No API key for {PROVIDERS[providerId].label}.{' '}
            <Link to="/setup" className="underline hover:text-amber-300">
              Configure it in Setup
            </Link>
            .
          </p>
        )}
      </div>

      <ProgressBar
        done={stats.done}
        error={stats.error}
        running={stats.running}
        total={stats.total}
      />

      {summary.status !== 'idle' && <SummaryPanel summary={summary} />}

      <ul className="space-y-2">
        {jobs.map((job, i) => (
          <JobItem
            key={job.chunk.chunk_id}
            job={job}
            activeSide={activeSide}
            onRetry={() => onRetry(i)}
          />
        ))}
      </ul>

      <footer className="flex items-center justify-between border-neutral-800 border-t pt-6">
        <Link to="/import" className="text-neutral-500 text-sm hover:text-neutral-300">
          ← Back to import
        </Link>
      </footer>
    </section>
  )
}

function ProgressBar({
  done,
  error,
  running,
  total,
}: {
  done: number
  error: number
  running: number
  total: number
}) {
  if (total === 0) return null
  const donePct = (done / total) * 100
  const errorPct = (error / total) * 100
  const runningPct = (running / total) * 100
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-900">
      <div className="flex h-full">
        <div className="bg-emerald-500/80" style={{ width: `${donePct}%` }} />
        <div className="bg-red-500/70" style={{ width: `${errorPct}%` }} />
        <div className="bg-emerald-400/30" style={{ width: `${runningPct}%` }} />
      </div>
    </div>
  )
}

function JobItem({
  job,
  activeSide,
  onRetry,
}: {
  job: Job
  activeSide: Side | null
  onRetry: () => void
}) {
  return (
    <li className="rounded-md border border-neutral-800 bg-neutral-900/30">
      <details>
        <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 text-sm">
          <span className="flex items-center gap-3">
            <StatusBadge status={job.status} />
            <span className="font-mono text-neutral-400">{job.chunk.chunk_id}</span>
            <span className="text-neutral-500 text-xs">
              {job.chunk.messages_count} msgs · {job.chunk.char_count.toLocaleString()} chars
            </span>
          </span>
          {job.status === 'error' && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                onRetry()
              }}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-neutral-100 text-xs hover:bg-neutral-700"
            >
              Retry
            </button>
          )}
        </summary>
        <div className="border-neutral-800 border-t bg-neutral-950 px-4 py-3">
          {job.status === 'done' && job.result && (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-neutral-200 text-xs">
              {job.result}
            </pre>
          )}
          {job.status === 'error' && (
            <p className="break-all font-mono text-red-400 text-xs">{job.error}</p>
          )}
          {(job.status === 'pending' || job.status === 'running') && (
            <p className="flex items-center gap-2 text-neutral-500 text-xs">
              {job.status === 'running' && <Spinner size="xs" className="text-emerald-300" />}
              <span>{job.status === 'running' ? 'Asking the model…' : 'Waiting…'}</span>
            </p>
          )}
          <details className="mt-3">
            <summary className="cursor-pointer text-neutral-500 text-xs hover:text-neutral-300">
              Show chunk text
            </summary>
            {activeSide ? (
              <p className="mt-2 text-neutral-500 text-xs">
                Highlighted lines are the SUBJECT —{' '}
                <strong className="text-emerald-300">{SIDE_LABEL[activeSide]}</strong>{' '}
                <span className="font-mono">({SIDE_MARKERS[activeSide]})</span>. Other lines are
                context only.
              </p>
            ) : (
              <p className="mt-2 text-neutral-500 text-xs">
                Pick a side above to see which lines will be analyzed.
              </p>
            )}
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs">
              <ChunkText text={job.chunk.text} activeSide={activeSide} />
            </pre>
          </details>
        </div>
      </details>
    </li>
  )
}

function ChunkText({ text, activeSide }: { text: string; activeSide: Side | null }) {
  if (!activeSide) {
    return <span className="text-neutral-400">{text}</span>
  }
  const subjectMarker = SIDE_MARKERS[activeSide]
  const contextMarker = SIDE_MARKERS[activeSide === 'outgoing' ? 'incoming' : 'outgoing']
  const lines = text.split('\n')
  let isSubject = false
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith(subjectMarker)) isSubject = true
        else if (line.startsWith(contextMarker)) isSubject = false
        // else: continuation line — inherit previous speaker
        const cls = isSubject ? 'text-emerald-300' : 'text-neutral-500'
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: lines have no stable id
          <span key={i} className={cls}>
            {line}
            {i < lines.length - 1 ? '\n' : ''}
          </span>
        )
      })}
    </>
  )
}

function SummaryPanel({ summary }: { summary: SummaryState }) {
  if (summary.status === 'idle') return null
  const sideLabel = SIDE_LABEL[summary.side]
  return (
    <section className="rounded-md border border-emerald-900/60 bg-emerald-950/20 p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-emerald-100 text-sm">
          Portrait — <span className="text-emerald-300">{sideLabel}</span>{' '}
          <span className="font-mono text-emerald-500">({SIDE_MARKERS[summary.side]})</span>
        </h2>
        <span className="text-emerald-500 text-xs">
          synthesized from {summary.fragmentCount} fragment(s)
        </span>
      </header>
      {summary.status === 'running' && (
        <p className="flex items-center gap-3 text-neutral-300 text-sm">
          <Spinner size="md" className="text-emerald-300" />
          <span>Synthesizing portrait — this typically takes 30-90s for a long chat.</span>
        </p>
      )}
      {summary.status === 'error' && (
        <p className="break-all font-mono text-red-400 text-xs">{summary.error}</p>
      )}
      {summary.status === 'done' && (
        <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap font-mono text-neutral-100 text-xs leading-relaxed">
          {summary.summary}
        </pre>
      )}
    </section>
  )
}

function SideButton({
  side,
  activeSide,
  disabled,
  onClick,
}: {
  side: Side
  activeSide: Side | null
  disabled: boolean
  onClick: () => void
}) {
  const isPrimary = activeSide === null || activeSide === side
  const cls = isPrimary
    ? 'border-emerald-700 bg-emerald-800 text-emerald-50 hover:bg-emerald-700'
    : 'border-neutral-700 bg-neutral-800 text-neutral-100 hover:bg-neutral-700'
  const label = activeSide === side ? `Re-run ${SIDE_LABEL[side]}` : `Analyze ${SIDE_LABEL[side]}`
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${cls}`}
    >
      {label} <span className="ml-1 font-mono opacity-70">{SIDE_MARKERS[side]}</span>
    </button>
  )
}

function StatusBadge({ status }: { status: JobStatus }) {
  const map: Record<JobStatus, { label: string; cls: string }> = {
    pending: { label: 'pending', cls: 'text-neutral-600' },
    running: { label: 'running…', cls: 'text-emerald-300' },
    done: { label: '✓ done', cls: 'text-emerald-400' },
    error: { label: '✗ failed', cls: 'text-red-400' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium text-xs ${cls}`}>
      {status === 'running' && <Spinner size="xs" />}
      {label}
    </span>
  )
}
