import { Link } from 'react-router'

export default function ImportInstructions() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Export your Telegram chat</h1>
        <p className="text-sm text-neutral-400">
          soulgrep works on a JSON export of a single chat. Telegram Desktop produces this file in a
          few clicks.
        </p>
      </header>

      <ol className="space-y-3 text-sm text-neutral-300">
        <li>
          <span className="mr-2 text-neutral-500">1.</span>
          Open <strong>Telegram Desktop</strong> (mobile clients cannot export).
        </li>
        <li>
          <span className="mr-2 text-neutral-500">2.</span>
          Open the chat you want to analyze.
        </li>
        <li>
          <span className="mr-2 text-neutral-500">3.</span>
          Click the <code className="text-neutral-100">⋯</code> menu →{' '}
          <strong>Export chat history</strong>.
        </li>
        <li>
          <span className="mr-2 text-neutral-500">4.</span>
          Under <em>Format</em>, choose <strong>Machine-readable JSON</strong>. Disable photos /
          videos / stickers — only text is used.
        </li>
        <li>
          <span className="mr-2 text-neutral-500">5.</span>
          Save the export, then unzip — the file you need is{' '}
          <code className="text-neutral-100">result.json</code>.
        </li>
      </ol>

      <p className="rounded-md border border-neutral-800 bg-neutral-900/40 p-4 text-xs text-neutral-500">
        Filling-out tip: more text from the target speaker = a richer signal. Aim for at least a few
        thousand of their messages.
      </p>

      <footer className="flex items-center justify-between border-t border-neutral-800 pt-6">
        <Link to="/" className="text-sm text-neutral-500 hover:text-neutral-300">
          ← Home
        </Link>
        <Link
          to="/import/upload"
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
        >
          I have the file →
        </Link>
      </footer>
    </section>
  )
}
