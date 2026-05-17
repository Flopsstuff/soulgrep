import { Link, NavLink, Outlet } from 'react-router'

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-mono font-bold text-lg tracking-tight">
            <SoulgrepMark className="h-5 w-5" />
            soulgrep
          </Link>
          <nav className="flex items-center gap-5 text-neutral-400 text-sm">
            <HeaderLink to="/import">Import</HeaderLink>
            <HeaderLink to="/setup">Setup</HeaderLink>
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
