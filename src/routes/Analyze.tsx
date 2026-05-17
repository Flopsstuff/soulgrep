import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { dropSession, getSession } from '../lib/analysisStore'
import { extractSignals } from '../lib/extractSignals'
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
  const abortRef = useRef<AbortController | null>(null)

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
                className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-neutral-100 text-xs hover:bg-neutral-700"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              disabled
              title="Aggregation step — coming next"
              className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-neutral-500 text-xs disabled:cursor-not-allowed"
            >
              Run summary →
            </button>
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

      <ul className="space-y-2">
        {jobs.map((job, i) => (
          <JobItem key={job.chunk.chunk_id} job={job} onRetry={() => onRetry(i)} />
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
        <div className="bg-neutral-500/70" style={{ width: `${runningPct}%` }} />
      </div>
    </div>
  )
}

function JobItem({ job, onRetry }: { job: Job; onRetry: () => void }) {
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
            <p className="text-neutral-500 text-xs">
              {job.status === 'running' ? 'Asking the model…' : 'Waiting…'}
            </p>
          )}
          <details className="mt-3">
            <summary className="cursor-pointer text-neutral-500 text-xs hover:text-neutral-300">
              Show chunk text
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-neutral-400 text-xs">
              {job.chunk.text}
            </pre>
          </details>
        </div>
      </details>
    </li>
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
    running: { label: 'running…', cls: 'text-neutral-300' },
    done: { label: '✓ done', cls: 'text-emerald-400' },
    error: { label: '✗ failed', cls: 'text-red-400' },
  }
  const { label, cls } = map[status]
  return <span className={`font-medium text-xs ${cls}`}>{label}</span>
}
