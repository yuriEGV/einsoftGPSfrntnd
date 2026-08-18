import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'

// Mock react-query
vi.mock('react-query', () => ({
  useQuery: vi.fn((key) => {
    if (key === 'users') {
      return {
        data: [
          { _id: 'u1', name: 'Juan Perez', email: 'juan@einsoft.com', role: 'admin', company: { name: 'Einsoft GPS' } },
          { _id: 'u2', name: 'Maria Rodriguez', email: 'maria@einsoft.com', role: 'driver' },
        ],
        isLoading: false,
      }
    }
    if (key === 'companies') {
      return {
        data: [{ _id: 'c1', name: 'Einsoft GPS' }],
        isLoading: false,
      }
    }
    return { data: [], isLoading: false }
  }),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isLoading: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}))

import Users from '../pages/Users.jsx'

describe('Users Page Component', () => {
  it('renders users page heading and user cards', () => {
    render(<Users />)
    expect(screen.getByText(/Gestión de Usuarios/i)).toBeInTheDocument()
    expect(screen.getByText('Juan Perez')).toBeInTheDocument()
    expect(screen.getByText('Maria Rodriguez')).toBeInTheDocument()
  })

  it('renders user creation button', () => {
    render(<Users />)
    const button = screen.getByRole('button', { name: /Crear Usuario/i })
    expect(button).toBeInTheDocument()
  })
})
