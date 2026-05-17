import { Link } from 'react-router'

export default function Home() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">soulgrep</h1>
        <p className="text-neutral-400">Surface the human signal hiding inside noisy text.</p>
      </div>
      <div className="flex gap-3">
        <Link
          to="/import"
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
        >
          Import a chat →
        </Link>
        <Link
          to="/setup"
          className="rounded-md border border-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
        >
          API keys
        </Link>
      </div>
    </section>
  )
}
