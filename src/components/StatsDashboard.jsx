import React from 'react'

export default function StatsDashboard({ vehicles, alerts }) {
  const stats = [
    {
      label: 'Vehículos totales',
      value: vehicles.length,
      color: 'bg-blue-500',
      icon: '🚗',
    },
    {
      label: 'Alertas activas',
      value: alerts.filter(a => !a.acknowledged).length,
      color: 'bg-red-500',
      icon: '⚠️',
    },
    {
      label: 'En movimiento',
      value: vehicles.filter(v => v.status === 'active').length,
      color: 'bg-green-500',
      icon: '✓',
    },
    {
      label: 'Sin conexión',
      value: vehicles.filter(v => v.status === 'offline').length,
      color: 'bg-gray-500',
      icon: '✗',
    },
  ]

  return (
    <div className="dashboard-grid">
      {stats.map((stat, idx) => (
        <div key={idx} className="card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
            </div>
            <div className="text-3xl">{stat.icon}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
