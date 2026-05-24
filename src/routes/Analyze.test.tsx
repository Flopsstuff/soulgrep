import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { putSession } from '../lib/analysisStore'

const extractSignalsMock = vi.fn()
const generateSummaryMock = vi.fn()

vi.mock('../lib/extractSignals', () => ({
  extractSignals: (...args: unknown[]) => extractSignalsMock(...args),
}))

vi.mock('../lib/generateSummary', () => ({
  generateSummary: (...args: unknown[]) => generateSummaryMock(...args),
}))

const { default: Analyze } = await import('./Analyze')

const chunks = [
  {
    chunk_id: 'c000001',
    messages_count: 3,
    char_count: 50,
    word_count: 10,
    text: '=> hello\n<= hi there',
  },
  {
    chunk_id: 'c000002',
    messages_count: 2,
    char_count: 30,
    word_count: 6,
    text: '=> how are you\n<= good',
  },
]

function renderAnalyze(sessionId?: string) {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/import/analyze', state: sessionId ? { sessionId } : undefined },
      ]}
    >
      <Analyze />
    </MemoryRouter>,
  )
}

describe('Analyze', () => {
  beforeEach(() => {
    localStorage.clear()
    extractSignalsMock.mockReset()
    generateSummaryMock.mockReset()
  })

  it('renders nothing when no session is in location state', () => {
    localStorage.setItem('soulgrep:keys:openai', 'sk-1')
    localStorage.setItem('soulgrep:active-provider', 'openai')
    const { container } = renderAnalyze()
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when no active provider is configured', () => {
    const sessionId = putSession(chunks)
    const { container } = renderAnalyze(sessionId)
    expect(container.firstChild).toBeNull()
  })

  it('renders the Analyze heading and chunk list when session and provider are ready', () => {
    localStorage.setItem('soulgrep:keys:openai', 'sk-1')
    localStorage.setItem('soulgrep:active-provider', 'openai')
    const sessionId = putSession(chunks)
    renderAnalyze(sessionId)
    expect(screen.getByRole('heading', { name: /analyze chat/i })).toBeInTheDocument()
    expect(screen.getByText('c000001')).toBeInTheDocument()
    expect(screen.getByText('c000002')).toBeInTheDocument()
  })

  it('shows Analyze outgoing and Analyze incoming buttons when idle', () => {
    localStorage.setItem('soulgrep:keys:openai', 'sk-1')
    localStorage.setItem('soulgrep:active-provider', 'openai')
    const sessionId = putSession(chunks)
    renderAnalyze(sessionId)
    expect(screen.getByRole('button', { name: /analyze outgoing/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /analyze incoming/i })).toBeInTheDocument()
  })

  it('Run summary button is disabled before any extraction runs', () => {
    localStorage.setItem('soulgrep:keys:openai', 'sk-1')
    localStorage.setItem('soulgrep:active-provider', 'openai')
    const sessionId = putSession(chunks)
    renderAnalyze(sessionId)
    expect(screen.getByRole('button', { name: /run summary/i })).toBeDisabled()
  })

  it('shows the provider name in the page description', () => {
    localStorage.setItem('soulgrep:keys:openai', 'sk-1')
    localStorage.setItem('soulgrep:active-provider', 'openai')
    const sessionId = putSession(chunks)
    renderAnalyze(sessionId)
    expect(screen.getAllByText(/openai/i).length).toBeGreaterThan(0)
  })

  it('calls extractSignals for each chunk when Analyze outgoing is clicked', async () => {
    extractSignalsMock.mockResolvedValue({ ok: true, signals: 'INFP pattern' })
    localStorage.setItem('soulgrep:keys:openai', 'sk-1')
    localStorage.setItem('soulgrep:active-provider', 'openai')
    const sessionId = putSession(chunks)
    renderAnalyze(sessionId)

    fireEvent.click(screen.getByRole('button', { name: /analyze outgoing/i }))

    await waitFor(() => {
      expect(extractSignalsMock).toHaveBeenCalledTimes(chunks.length)
    })
    expect(extractSignalsMock).toHaveBeenCalledWith(
      expect.objectContaining({ side: 'outgoing', chunk: chunks[0] }),
    )
    expect(extractSignalsMock).toHaveBeenCalledWith(
      expect.objectContaining({ side: 'outgoing', chunk: chunks[1] }),
    )
  })

  it('shows chunk status as done after successful extraction', async () => {
    extractSignalsMock.mockResolvedValue({ ok: true, signals: 'high openness' })
    localStorage.setItem('soulgrep:keys:openai', 'sk-1')
    localStorage.setItem('soulgrep:active-provider', 'openai')
    const sessionId = putSession(chunks)
    renderAnalyze(sessionId)

    fireEvent.click(screen.getByRole('button', { name: /analyze outgoing/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/✓ done/)).toHaveLength(chunks.length)
    })
  })

  it('shows error status and Retry button when extraction fails', async () => {
    extractSignalsMock.mockResolvedValue({ ok: false, error: 'API error' })
    localStorage.setItem('soulgrep:keys:openai', 'sk-1')
    localStorage.setItem('soulgrep:active-provider', 'openai')
    const sessionId = putSession(chunks)
    renderAnalyze(sessionId)

    fireEvent.click(screen.getByRole('button', { name: /analyze outgoing/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/✗ failed/)).toHaveLength(chunks.length)
    })
    expect(screen.getAllByRole('button', { name: /retry/i })).toHaveLength(chunks.length)
  })

  it('shows a warning when the API key is missing', () => {
    localStorage.setItem('soulgrep:active-provider', 'openai')
    // no key set
    const sessionId = putSession(chunks)
    renderAnalyze(sessionId)
    expect(screen.getByText(/no api key for openai/i)).toBeInTheDocument()
  })

  it('shows a Back to import link', () => {
    localStorage.setItem('soulgrep:keys:openai', 'sk-1')
    localStorage.setItem('soulgrep:active-provider', 'openai')
    const sessionId = putSession(chunks)
    renderAnalyze(sessionId)
    expect(screen.getByRole('link', { name: /back to import/i })).toBeInTheDocument()
  })
})
