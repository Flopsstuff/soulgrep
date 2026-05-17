import { Link, Outlet } from 'react-router'

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-mono text-lg font-bold tracking-tight">
            soulgrep
          </Link>
          <nav className="text-sm text-neutral-400">
            <span className="font-mono">grep the human signal from the noise</span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Outlet />
      </main>
    </div>
  )
}
