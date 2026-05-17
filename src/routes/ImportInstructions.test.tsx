import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import ImportInstructions from './ImportInstructions'

describe('ImportInstructions', () => {
  it('renders the heading and a Next link to /import/upload', () => {
    render(
      <MemoryRouter>
        <ImportInstructions />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /export your telegram chat/i })).toBeInTheDocument()
    const next = screen.getByRole('link', { name: /i have the file/i })
    expect(next).toHaveAttribute('href', '/import/upload')
  })
})
