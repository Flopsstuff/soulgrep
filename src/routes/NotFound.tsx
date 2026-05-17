import { Link } from 'react-router'

export default function NotFound() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">404</h1>
      <p className="text-neutral-400">No signal here.</p>
      <Link to="/" className="text-sm text-neutral-300 underline underline-offset-4">
        Back to home
      </Link>
    </section>
  )
}
