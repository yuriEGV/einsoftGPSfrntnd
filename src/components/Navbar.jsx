import React from 'react'

export default function Navbar() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  return (
    <nav className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Panel de control</h2>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            {user.name || 'Usuario'}
          </div>
          <button className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium transition-colors">
            Perfil
          </button>
        </div>
      </div>
    </nav>
  )
}
