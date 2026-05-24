import { Link, NavLink, Outlet } from 'react-router'

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-mono font-bold text-lg tracking-tight"
          >
            <SoulgrepMark className="h-5 w-5" />
            soulgrep
          </Link>
          <nav className="flex items-center gap-5 text-neutral-400 text-sm">
            <HeaderLink to="/import">Import</HeaderLink>
            <HeaderLink to="/setup">Setup</HeaderLink>
            <a
              href="https://github.com/Flopsstuff/soulgrep"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="soulgrep on GitHub"
              title="GitHub"
              className="ml-1 text-neutral-500 hover:text-neutral-100"
            >
              <GithubMark className="h-5 w-5" />
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Outlet />
      </main>
    </div>
  )
}

function SoulgrepMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d="M8 4 H4 V20 H8" />
      <path d="M16 4 H20 V20 H16" />
      <circle cx="12" cy="10.5" r="2" fill="currentColor" stroke="none" />
      <path d="M8.5 17.5 a3.5 3 0 0 1 7 0 Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.31.678.92.678 1.855 0 1.339-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  )
}

function HeaderLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive ? 'text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'
      }
    >
      {children}
    </NavLink>
  )
}
