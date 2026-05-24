import { Link } from 'react-router'

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="space-y-5">
        <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">soulgrep</h1>
        <p className="max-w-2xl font-medium text-2xl text-neutral-100 leading-snug sm:text-2xl">
          Pull a psychological portrait of one person out of a chat log.
        </p>
        <p className="max-w-2xl text-base text-neutral-400 leading-relaxed">
          Nothing leaves your browser except the call to the model you chose, under your key.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            to="/import"
            className="rounded-md bg-neutral-100 px-4 py-2 font-medium text-neutral-900 text-sm hover:bg-white"
          >
            Start an import →
          </Link>
          <Link
            to="/setup"
            className="rounded-md border border-neutral-800 px-4 py-2 text-neutral-300 text-sm hover:bg-neutral-900"
          >
            Configure providers
          </Link>
        </div>
      </section>

      <Section title="How it works">
        <Step
          n={1}
          title="Pick a provider"
          body="OpenAI, Anthropic, or OpenRouter. Your API key lives in this browser — nothing leaves the page except the calls you make to that one model."
        />
        <Step
          n={2}
          title="Drop in a chat export"
          body="Export a one-on-one conversation from Telegram Desktop as result.json and upload it. Parsing happens in a Web Worker so the UI stays smooth even on multi-megabyte files."
        />
        <Step
          n={3}
          title="Build a persona corpus"
          body="Messages get cleaned of timestamps, names, links and phone numbers, tagged by side (target vs opponent), and chunked to fit the model’s context window."
        />
        <Step
          n={4}
          title="Analyze"
          body="Chunks fan out to the model in parallel. Signals are extracted per side, then synthesized into a single portrait you can read end-to-end."
        />
      </Section>

      <Section title="What you get">
        <ul className="space-y-3 text-neutral-300">
          <Bullet>
            A side-by-side read on the <em>target</em> speaker — tone, recurring themes,
            communication style, emotional cadence — separated from the opponent’s noise.
          </Bullet>
          <Bullet>
            Extracted signals carry the quotes they came from, so you can audit what the model
            picked up and where.
          </Bullet>
          <Bullet>
            A synthesized portrait at the end: a coherent psychotype sketch instead of a wall of raw
            observations.
          </Bullet>
        </ul>
      </Section>

      <Section title="Privacy">
        <ul className="space-y-3 text-neutral-300">
          <Bullet>
            100% client-side. There is no soulgrep backend — the static page is served from
            Cloudflare and that’s it.
          </Bullet>
          <Bullet>
            API keys live in <code className="text-neutral-200">localStorage</code> on this device.
            Clearing site data wipes them.
          </Bullet>
          <Bullet>
            Chat content is processed in your browser; chunks go directly to the provider you chose,
            under your key, billed to your account.
          </Bullet>
        </ul>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 border-neutral-900 border-t pt-10">
      <h2 className="font-medium text-neutral-500 text-xs uppercase tracking-[0.15em]">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-5">
      <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-neutral-800 font-mono text-neutral-500 text-xs">
        {n}
      </div>
      <div className="space-y-1.5 pt-0.5">
        <h3 className="font-medium text-neutral-100">{title}</h3>
        <p className="text-neutral-400 leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 leading-relaxed">
      <span className="mt-2 h-1 w-1 flex-none rounded-full bg-neutral-600" aria-hidden />
      <span>{children}</span>
    </li>
  )
}
