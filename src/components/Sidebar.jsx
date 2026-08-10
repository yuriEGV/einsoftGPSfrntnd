import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

const menuItems = [
  { label: 'Panel', icon: '📊', path: '/' },
  { label: 'Clientes', icon: '👥', path: '/companies' },
  { label: 'Vehículos', icon: '🚗', path: '/vehicles' },
  { label: 'Reportes', icon: '📈', path: '/reports' },
  { label: 'Alertas', icon: '⚠️', path: '/alerts' },
  { label: 'Geocercas', icon: '🗺️', path: '/geofences' },
  { label: 'Usuarios', icon: '👤', path: '/users' },
  { label: 'Configuración', icon: '⚙️', path: '/settings' },
]

export default function Sidebar({ onLogout, isOpen, setIsOpen }) {
  const navigate = useNavigate()
  const location = useLocation()

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isSuperAdmin = user.role === 'admin' && !user.company

  const filteredMenuItems = menuItems.filter(item => {
    // Solo Súper Administradores pueden ver/gestionar Empresas (Clientes)
    if (item.path === '/companies') return isSuperAdmin
    return true
  })

  const handleLogoutClick = () => {
    if (typeof onLogout === 'function') {
      onLogout()
    }
    navigate('/login')
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white p-6 transition-transform duration-300 transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex flex-col
      `}>
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent italic tracking-tighter">Einsoft GPS</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-800 px-1.5 py-0.5 rounded">Gestor de GPS</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded font-black tracking-widest">v2.1.0</span>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-white hover:text-blue-400 transition-colors">✕</button>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${location.pathname === item.path
                ? 'bg-blue-600 shadow-lg shadow-blue-500/20'
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
            >
              <span className={`text-xl transition-transform duration-200 ${location.pathname === item.path ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
              <span className="text-sm font-bold tracking-tight">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="pt-4 border-t border-slate-700">
          <button
            onClick={handleLogoutClick}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
