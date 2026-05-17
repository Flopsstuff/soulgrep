import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/runCorpusInWorker.ts', () => ({
  runCorpusInWorker: vi.fn(async () => [
    {
      chunk_id: 'c000001',
      messages_count: 2,
      char_count: 12,
      word_count: 4,
      text: '> hello\n< hi back',
    },
  ]),
}))

const { default: ImportUpload } = await import('./ImportUpload')

function renderPage() {
  return render(
    <MemoryRouter>
      <ImportUpload />
    </MemoryRouter>,
  )
}

describe('ImportUpload', () => {
  it('renders the dropzone and back link', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /import a chat/i })).toBeInTheDocument()
    expect(screen.getByText(/drop result\.json/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to instructions/i })).toHaveAttribute(
      'href',
      '/import',
    )
  })

  it('shows chunks summary after processing a file', async () => {
    const { container } = renderPage()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['{"id":1,"messages":[]}'], 'result.json', { type: 'application/json' })

    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /download \.jsonl/i })).toBeInTheDocument()
    })
    // Stats line includes "1" chunks and "2" messages split across <strong> nodes.
    const summary = screen.getByText(
      (_, el) => el?.tagName === 'P' && /chunks/.test(el.textContent ?? ''),
    )
    expect(summary.textContent).toContain('1')
    expect(summary.textContent).toContain('2 messages')
  })
})
