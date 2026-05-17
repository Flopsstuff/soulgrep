import { useState } from 'react'
import { Link } from 'react-router'
import { useActiveProvider, useHasActiveSelection, useStoredKey, useStoredModel } from '../lib/keys'
import { type PingResult, pingModel } from '../lib/pingModel'
import { PROVIDER_IDS, PROVIDERS, type ProviderId } from '../lib/providers'
import { type TestResult, testProviderKey } from '../lib/testKey'

type TestState = { status: 'idle' } | { status: 'testing' } | { status: 'done'; result: TestResult }
type PingState = { status: 'idle' } | { status: 'pinging' } | { status: 'done'; result: PingResult }

export default function Setup() {
  const hasActiveSelection = useHasActiveSelection()
  const [activeProvider] = useActiveProvider()

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Setup</h1>
        <p className="text-sm text-neutral-400">
          API keys are stored in this browser only (
          <code className="text-neutral-300">localStorage</code>
          ). They are never sent anywhere.
        </p>
      </header>

      <div className="space-y-4">
        {PROVIDER_IDS.map((id) => (
          <ProviderCard key={id} id={id} />
        ))}
      </div>

      <footer className="flex items-center justify-between border-t border-neutral-800 pt-6">
        <p className="text-xs text-neutral-500">
          {hasActiveSelection && activeProvider ? (
            <ActiveSummary id={activeProvider} />
          ) : (
            'Set a key and pick the model you want to use.'
          )}
        </p>
        <Link
          to="/"
          aria-disabled={!hasActiveSelection}
          className={
            hasActiveSelection
              ? 'rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white'
              : 'pointer-events-none rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-500'
          }
        >
          Continue →
        </Link>
      </footer>
    </section>
  )
}

function ActiveSummary({ id }: { id: ProviderId }) {
  const [model] = useStoredModel(id)
  return (
    <>
      Active: {PROVIDERS[id].label} · {model}
    </>
  )
}

function ProviderCard({ id }: { id: ProviderId }) {
  const provider = PROVIDERS[id]
  const [stored, save, clear] = useStoredKey(id)
  const [model, setModel] = useStoredModel(id)
  const [activeProvider, setActiveProvider] = useActiveProvider()
  const [draft, setDraft] = useState(stored)
  const [reveal, setReveal] = useState(false)
  const [test, setTest] = useState<TestState>({ status: 'idle' })
  const [ping, setPing] = useState<PingState>({ status: 'idle' })

  const dirty = draft.trim() !== stored
  const isActive = activeProvider === id
  const canBecomeActive = stored !== '' && !isActive
  const canPing = stored !== '' && model.trim() !== '' && ping.status !== 'pinging'

  const onSave = () => {
    save(draft)
    setTest({ status: 'idle' })
    setPing({ status: 'idle' })
  }

  const onClear = () => {
    clear()
    setDraft('')
    setTest({ status: 'idle' })
    setPing({ status: 'idle' })
  }

  const onTest = async () => {
    const value = draft.trim()
    if (value === '') {
      setTest({ status: 'done', result: { ok: false, error: 'Enter a key first' } })
      return
    }
    setTest({ status: 'testing' })
    if (dirty) save(draft)
    const result = await testProviderKey(id, value)
    setTest({ status: 'done', result })
  }

  const onPing = async () => {
    if (dirty) save(draft)
    setPing({ status: 'pinging' })
    const result = await pingModel(id, stored || draft.trim(), model)
    setPing({ status: 'done', result })
  }

  return (
    <article className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-medium">{provider.label}</h2>
          <a
            href={provider.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-neutral-500 underline-offset-4 hover:text-neutral-300 hover:underline"
          >
            get key →
          </a>
        </div>
        <div className="flex items-center gap-3">
          <TestBadge state={test} />
          <ActiveControl
            isActive={isActive}
            canBecomeActive={canBecomeActive}
            onActivate={() => setActiveProvider(id)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={reveal ? 'text' : 'password'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (dirty) save(draft)
            }}
            placeholder={provider.keyHint}
            spellCheck={false}
            autoComplete="off"
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 pr-16 font-mono text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-neutral-500 hover:text-neutral-300"
          >
            {reveal ? 'hide' : 'show'}
          </button>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty}
          className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onTest}
          disabled={test.status === 'testing' || draft.trim() === ''}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {test.status === 'testing' ? 'Testing…' : 'Test'}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={stored === '' && draft === ''}
          className="rounded-md border border-neutral-800 px-3 py-2 text-sm text-neutral-500 hover:text-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label htmlFor={`model-${id}`} className="text-xs text-neutral-500">
          Model
        </label>
        <select
          id={`model-${id}`}
          aria-label={`${provider.label} model`}
          value={model}
          onChange={(e) => {
            setModel(e.target.value)
            setPing({ status: 'idle' })
          }}
          className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 font-mono text-xs text-neutral-100 focus:border-neutral-600 focus:outline-none"
        >
          {provider.models.includes(model) ? null : <option value={model}>{model} (custom)</option>}
          {provider.models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onPing}
          disabled={!canPing}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-neutral-100 text-xs hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ping.status === 'pinging' ? 'Pinging…' : 'Ping'}
        </button>
        <PingBadge state={ping} />
      </div>

      {test.status === 'done' && !test.result.ok && (
        <p className="mt-3 break-all font-mono text-xs text-red-400">test: {test.result.error}</p>
      )}
      {ping.status === 'done' && !ping.result.ok && (
        <p className="mt-3 break-all font-mono text-xs text-red-400">ping: {ping.result.error}</p>
      )}
    </article>
  )
}

function TestBadge({ state }: { state: TestState }) {
  if (state.status === 'idle') {
    return <span className="text-xs text-neutral-600">untested</span>
  }
  if (state.status === 'testing') {
    return <span className="text-xs text-neutral-400">testing…</span>
  }
  return state.result.ok ? (
    <span className="text-xs font-medium text-emerald-400">✓ ok</span>
  ) : (
    <span className="text-xs font-medium text-red-400">✗ failed</span>
  )
}

function PingBadge({ state }: { state: PingState }) {
  if (state.status === 'idle') return null
  if (state.status === 'pinging') {
    return <span className="text-xs text-neutral-400">pinging…</span>
  }
  if (state.result.ok) {
    return (
      <span className="break-all font-mono text-emerald-300 text-xs">{state.result.reply}</span>
    )
  }
  return <span className="text-xs font-medium text-red-400">✗ ping failed</span>
}

function ActiveControl({
  isActive,
  canBecomeActive,
  onActivate,
}: {
  isActive: boolean
  canBecomeActive: boolean
  onActivate: () => void
}) {
  if (isActive) {
    return (
      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300 text-xs font-medium">
        ✓ Active
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onActivate}
      disabled={!canBecomeActive}
      className="rounded-md border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Use as active
    </button>
  )
}
