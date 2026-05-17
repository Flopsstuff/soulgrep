import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/pingModel', () => ({
  pingModel: vi.fn().mockResolvedValue({ ok: true, reply: 'pong' }),
}))

const Setup = (await import('./Setup')).default

function renderSetup() {
  return render(
    <MemoryRouter>
      <Setup />
    </MemoryRouter>,
  )
}

describe('Setup page', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders all three provider cards', () => {
    renderSetup()
    expect(screen.getByRole('heading', { name: /openai/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /anthropic/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /openrouter/i })).toBeInTheDocument()
  })

  it('shows Save/Test/Clear per provider', () => {
    renderSetup()
    expect(screen.getAllByRole('button', { name: /^save$/i })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: /^test$/i })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: /^clear$/i })).toHaveLength(3)
  })

  it('renders a model select per provider', () => {
    renderSetup()
    expect(screen.getAllByRole('combobox')).toHaveLength(3)
    expect(screen.getByLabelText(/openai model/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/anthropic model/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/openrouter model/i)).toBeInTheDocument()
  })

  it('persists model selection to localStorage', () => {
    renderSetup()
    const openaiModel = screen.getByLabelText(/openai model/i)
    fireEvent.change(openaiModel, { target: { value: 'gpt-5-nano' } })
    expect(localStorage.getItem('soulgrep:model:openai')).toBe('gpt-5-nano')
  })

  it('disables Continue when no active selection', () => {
    renderSetup()
    const continueLink = screen.getByRole('link', { name: /continue/i })
    expect(continueLink).toHaveAttribute('aria-disabled', 'true')
  })

  it('enables Continue when a key is set (auto-activates provider)', () => {
    localStorage.setItem('soulgrep:keys:openai', 'sk-test')
    localStorage.setItem('soulgrep:active-provider', 'openai')
    renderSetup()
    const continueLink = screen.getByRole('link', { name: /continue/i })
    expect(continueLink).toHaveAttribute('aria-disabled', 'false')
  })

  it('shows active provider and model in the footer hint', () => {
    localStorage.setItem('soulgrep:keys:anthropic', 'sk-ant')
    localStorage.setItem('soulgrep:active-provider', 'anthropic')
    localStorage.setItem('soulgrep:model:anthropic', 'claude-opus-4-7')
    renderSetup()
    expect(screen.getByText(/active:.*anthropic.*claude-opus-4-7/i)).toBeInTheDocument()
  })

  it('renders a Ping button per provider, disabled when no key is set', () => {
    renderSetup()
    const pingButtons = screen.getAllByRole('button', { name: /^ping$/i })
    expect(pingButtons).toHaveLength(3)
    for (const button of pingButtons) {
      expect(button).toBeDisabled()
    }
  })

  it('enables Ping when a key is stored', () => {
    localStorage.setItem('soulgrep:keys:openai', 'sk-1')
    renderSetup()
    const openaiCard = screen.getByRole('heading', { name: /openai/i }).closest('article')
    if (!openaiCard) throw new Error('OpenAI card not found')
    const pingButton = within(openaiCard).getByRole('button', { name: /^ping$/i })
    expect(pingButton).not.toBeDisabled()
  })

  it('clicking "Use as active" on another card switches the active provider', () => {
    localStorage.setItem('soulgrep:keys:openai', 'sk-1')
    localStorage.setItem('soulgrep:keys:anthropic', 'sk-2')
    localStorage.setItem('soulgrep:active-provider', 'openai')
    renderSetup()

    const anthropicCard = screen.getByRole('heading', { name: /anthropic/i }).closest('article')
    if (!anthropicCard) throw new Error('Anthropic card not found')
    const switchButton = within(anthropicCard).getByRole('button', { name: /use as active/i })
    fireEvent.click(switchButton)

    expect(localStorage.getItem('soulgrep:active-provider')).toBe('anthropic')
  })
})
