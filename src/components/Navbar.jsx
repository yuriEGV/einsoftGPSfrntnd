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
        <div className="flex items-center space-x-3">
          <a
            href="https://t.me/EinGpsBot"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
          >
            <span>📱</span> Bot @EinGpsBot
          </a>
          <div className="hidden sm:block text-sm text-gray-600 font-medium">
            {user.name || 'Usuario'}
          </div>
        </div>
      </div>
    </nav>
  )
}
