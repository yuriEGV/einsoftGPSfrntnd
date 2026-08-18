import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

// Mock react-query
vi.mock('react-query', () => ({
  useQuery: vi.fn((key) => {
    if (key === 'vehicles') {
      return {
        data: [
          { _id: 'v1', name: 'Truck A1', licensePlate: 'A1-001', status: 'active', speed: 65, location: { coordinates: [-69.9, 18.4] } },
        ],
        isLoading: false,
      }
    }
    if (key === 'alerts') {
      return {
        data: [],
        isLoading: false,
      }
    }
    return { data: [], isLoading: false }
  }),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}))

// Mock MapComponent, VehicleList, AlertsPanel, StatsDashboard
vi.mock('../components/MapComponent', () => ({
  default: () => <div data-testid="map-component">Map View</div>,
}))
vi.mock('../components/VehicleList', () => ({
  default: () => <div data-testid="vehicle-list">Vehicle List</div>,
}))
vi.mock('../components/AlertsPanel', () => ({
  default: () => <div data-testid="alerts-panel">Alerts Panel</div>,
}))
vi.mock('../components/StatsDashboard', () => ({
  default: () => <div data-testid="stats-dashboard">Stats Dashboard</div>,
}))
vi.mock('../services/socket', () => ({
  setupSocketConnection: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}))

import Dashboard from '../pages/Dashboard.jsx'

describe('Dashboard Page Component', () => {
  it('renders dashboard heading', () => {
    render(<Dashboard />)
    expect(screen.getByText(/Mis Vehículos|Control de Gestión/i)).toBeInTheDocument()
  })

  it('renders child layout components', () => {
    render(<Dashboard />)
    expect(screen.getByTestId('map-component')).toBeInTheDocument()
    expect(screen.getByTestId('stats-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('vehicle-list')).toBeInTheDocument()
  })
})
