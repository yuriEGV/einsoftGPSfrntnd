import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

// ─── Menú por rol ──────────────────────────────────────────────────────────────
const ALL_MENU_ITEMS = [
  {
    label: 'Panel',
    icon: '📊',
    path: '/',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'client', 'auditor', 'fleet_manager', 'independent'],
  },
  {
    label: 'Clientes',
    icon: '🏢',
    path: '/companies',
    allowedRoles: ['superadmin', 'admin'],
  },
  {
    label: 'Vehículos',
    icon: '🚗',
    path: '/vehicles',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'client', 'auditor', 'fleet_manager', 'independent'],
  },
  {
    label: 'Rastreo Personal',
    icon: '📱',
    path: '/people-tracker',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'auditor', 'fleet_manager', 'independent'],
    badge: 'SOS',
  },
  {
    label: 'Reportes',
    icon: '📈',
    path: '/reports',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'client', 'auditor', 'fleet_manager', 'independent'],
  },
  {
    label: 'Alertas',
    icon: '⚠️',
    path: '/alerts',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'auditor', 'fleet_manager', 'independent'],
  },
  {
    label: 'Geocercas',
    icon: '🗺️',
    path: '/geofences',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'auditor', 'fleet_manager', 'independent'],
  },
  {
    label: 'Usuarios',
    icon: '👥',
    path: '/users',
    allowedRoles: ['superadmin', 'admin', 'supervisor', 'auditor', 'fleet_manager'],
  },
  {
    label: 'Configuración',
    icon: '⚙️',
    path: '/settings',
    allowedRoles: ['superadmin', 'admin', 'fleet_manager', 'independent'],
  },
  {
    label: 'App Celular GPS',
    icon: '📱',
    path: '/mobile-gps',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'client', 'auditor', 'fleet_manager', 'independent', 'driver', 'mobile_gps_user'],
    badge: 'Móvil',
  },
]

// Etiquetas de rol para mostrar en el sidebar
const ROLE_DISPLAY = {
  superadmin: { label: '🔴 Superadmin', badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
  admin: { label: '🔴 Administrador', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  operator: { label: '🔴 Operador GPS', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  supervisor: { label: '🔴 Supervisor', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  driver: { label: '🟠 Conductor', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  mobile_gps_user: { label: '🟢 Celular GPS', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  client: { label: '🟠 Cliente Consulta', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  auditor: { label: '🟡 Auditor (Lectura)', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  // Legacy support
  fleet_manager: { label: '🔴 Administrador', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  independent: { label: '🟢 Celular GPS', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
}

export default function Sidebar({ onLogout, isOpen, setIsOpen }) {
  const navigate = useNavigate()
  const location = useLocation()

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  let role = user.role || 'client'
  if (role === 'fleet_manager') role = 'admin'
  if (role === 'independent') role = 'mobile_gps_user'
  
  const roleInfo = ROLE_DISPLAY[user.role] || ROLE_DISPLAY[role] || ROLE_DISPLAY.client

  // Filtrar menú estrictamente por rol
  const menuItems = ALL_MENU_ITEMS.filter(item => item.allowedRoles.includes(user.role) || item.allowedRoles.includes(role))

  const handleLogoutClick = () => {
    if (typeof onLogout === 'function') onLogout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        {/* ── Header ── */}
        <div className="p-6 pb-4 border-b border-slate-700/60">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="text-xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent italic tracking-tighter">
                Einsoft GPS
              </h1>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">v2.3.0</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400 hover:text-white transition-colors">✕</button>
          </div>

          {/* User info */}
          <div className="bg-slate-800/60 rounded-xl p-3">
            <p className="text-sm font-bold text-white truncate">{user.name || user.email || 'Usuario'}</p>
            <p className="text-xs text-slate-400 truncate mb-2">{user.email}</p>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wide ${roleInfo.badge}`}>
              {roleInfo.label}
            </span>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600 shadow-lg shadow-blue-500/20 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`text-xl transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                <span className="text-sm font-bold tracking-tight flex-1">{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-black bg-purple-500 text-white rounded-md tracking-wider uppercase shadow-sm">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* ── Footer ── */}
        <div className="p-4 border-t border-slate-700/60">
          <button
            onClick={handleLogoutClick}
            className="w-full px-4 py-2.5 bg-red-600/90 hover:bg-red-600 rounded-xl text-sm font-bold transition-all hover:shadow-lg hover:shadow-red-900/30 flex items-center justify-center gap-2"
          >
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
