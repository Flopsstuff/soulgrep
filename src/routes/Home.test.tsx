import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import Home from './Home'

describe('Home', () => {
  it('renders the soulgrep heading', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /soulgrep/i })).toBeInTheDocument()
  })
})
