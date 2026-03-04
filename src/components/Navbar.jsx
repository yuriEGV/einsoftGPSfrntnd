import React from 'react'

export default function Navbar({ toggleSidebar }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  return (
    <nav className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="mr-4 md:hidden text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 truncate">Panel de control</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden sm:block text-sm text-gray-600">
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
