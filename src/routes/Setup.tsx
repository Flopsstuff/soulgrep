import { useState } from 'react'
import { Link } from 'react-router'
import { useHasAnyKey, useStoredKey } from '../lib/keys'
import { PROVIDER_IDS, PROVIDERS, type ProviderId } from '../lib/providers'
import { type TestResult, testProviderKey } from '../lib/testKey'

type TestState = { status: 'idle' } | { status: 'testing' } | { status: 'done'; result: TestResult }

export default function Setup() {
  const hasAnyKey = useHasAnyKey()

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
          {hasAnyKey ? 'At least one key set.' : 'Set at least one key to continue.'}
        </p>
        <Link
          to="/"
          aria-disabled={!hasAnyKey}
          className={
            hasAnyKey
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

function ProviderCard({ id }: { id: ProviderId }) {
  const provider = PROVIDERS[id]
  const [stored, save, clear] = useStoredKey(id)
  const [draft, setDraft] = useState(stored)
  const [reveal, setReveal] = useState(false)
  const [test, setTest] = useState<TestState>({ status: 'idle' })

  const dirty = draft.trim() !== stored

  const onSave = () => {
    save(draft)
    setTest({ status: 'idle' })
  }

  const onClear = () => {
    clear()
    setDraft('')
    setTest({ status: 'idle' })
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
        <TestBadge state={test} />
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

      {test.status === 'done' && !test.result.ok && (
        <p className="mt-3 break-all font-mono text-xs text-red-400">{test.result.error}</p>
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
