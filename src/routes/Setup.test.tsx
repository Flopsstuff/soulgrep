import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import Setup from './Setup'

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

  it('disables Continue when no keys are set', () => {
    renderSetup()
    const continueLink = screen.getByRole('link', { name: /continue/i })
    expect(continueLink).toHaveAttribute('aria-disabled', 'true')
  })

  it('enables Continue when at least one key is stored', () => {
    localStorage.setItem('soulgrep:keys:openai', 'sk-test')
    renderSetup()
    const continueLink = screen.getByRole('link', { name: /continue/i })
    expect(continueLink).toHaveAttribute('aria-disabled', 'false')
  })
})
