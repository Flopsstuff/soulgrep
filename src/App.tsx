import { Link, NavLink, Outlet } from 'react-router'

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-mono font-bold text-lg tracking-tight">
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
