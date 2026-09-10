import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits'

// ─── Menú por rol (Sober Security Enterprise Layout) ─────────────────────────
const ALL_MENU_ITEMS = [
  {
    label: 'Panel General',
    icon: '📊',
    path: '/',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'client', 'auditor', 'fleet_manager', 'independent'],
  },
  {
    label: 'Clientes & Cuentas',
    icon: '🏢',
    path: '/companies',
    allowedRoles: ['superadmin', 'admin'],
  },
  {
    label: 'Unidades & Vehículos',
    icon: '🚗',
    path: '/vehicles',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'client', 'auditor', 'fleet_manager', 'independent'],
  },
  {
    label: 'Ubicación & Personas',
    icon: '📱',
    path: '/people-tracker',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'auditor', 'fleet_manager', 'independent'],
    badge: 'SOS',
  },
  {
    label: 'Centro de Alertas',
    icon: '⚠️',
    path: '/alerts',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'auditor', 'fleet_manager', 'independent'],
  },
  {
    label: 'Geocercas de Seguridad',
    icon: '🗺️',
    path: '/geofences',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'auditor', 'fleet_manager', 'independent'],
  },
  {
    label: 'Reportes & Auditoría',
    icon: '📈',
    path: '/reports',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'client', 'auditor', 'fleet_manager', 'independent'],
  },
  {
    label: 'Control de Usuarios',
    icon: '👥',
    path: '/users',
    allowedRoles: ['superadmin', 'admin', 'supervisor', 'auditor', 'fleet_manager'],
  },
  {
    label: 'Configuración de Sistema',
    icon: '⚙️',
    path: '/settings',
    allowedRoles: ['superadmin', 'admin', 'fleet_manager', 'independent'],
  },
  {
    label: 'Plataforma Plus',
    icon: '⚡',
    path: '/plataforma-plus',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'client', 'auditor', 'fleet_manager', 'independent'],
    badge: 'PLUS',
  },
  {
    label: 'Suscripción & Facturación',
    icon: '💳',
    path: '/payments',
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'client', 'auditor', 'fleet_manager', 'independent', 'driver', 'mobile_gps_user'],
  },
  {
    label: 'EYE-NODE 360 (App)',
    icon: '🛰️',
    path: 'https://einsoft-gp-sbcknd.vercel.app/eyenode',
    external: true,
    allowedRoles: ['superadmin', 'admin', 'operator', 'supervisor', 'client', 'auditor', 'fleet_manager', 'independent', 'driver', 'mobile_gps_user'],
    badge: 'PWA',
  },
]

// Etiquetas de rol sobrias y corporativas
const ROLE_DISPLAY = {
  superadmin: { label: 'Superadministrador', badge: 'bg-slate-800 text-slate-200 border-slate-700' },
  admin: { label: 'Administrador de Seguridad', badge: 'bg-slate-800 text-slate-200 border-slate-700' },
  operator: { label: 'Operador SOC 24/7', badge: 'bg-slate-800 text-cyan-300 border-cyan-800/40' },
  supervisor: { label: 'Supervisor Operativo', badge: 'bg-slate-800 text-slate-200 border-slate-700' },
  driver: { label: 'Conductor Asignado', badge: 'bg-slate-800 text-amber-300 border-amber-800/40' },
  mobile_gps_user: { label: 'Nodo Celular GPS', badge: 'bg-slate-800 text-emerald-300 border-emerald-800/40' },
  client: { label: 'Cliente de Consulta', badge: 'bg-slate-800 text-slate-300 border-slate-700' },
  auditor: { label: 'Auditor de Seguridad', badge: 'bg-slate-800 text-slate-300 border-slate-700' },
  fleet_manager: { label: 'Gestor de Flota', badge: 'bg-slate-800 text-slate-200 border-slate-700' },
  independent: { label: 'Nodo Celular GPS', badge: 'bg-slate-800 text-emerald-300 border-emerald-800/40' },
}

export default function Sidebar({ onLogout, isOpen, setIsOpen }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isPaid, planName, queriesUsed, dailyLimit, isBlocked } = useSubscriptionLimits()

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  let role = user.role || 'client'
  if (role === 'fleet_manager') role = 'admin'
  if (role === 'independent') role = 'mobile_gps_user'
  
  const roleInfo = ROLE_DISPLAY[user.role] || ROLE_DISPLAY[role] || ROLE_DISPLAY.client

  // Módulos que se ocultan en modo gratuito / demo según solicitud
  const HIDDEN_IN_FREE_MODE = ['/alerts', '/geofences', '/reports', '/plataforma-plus', '/companies', '/users']

  // Filtrar menú estrictamente por rol y suscripción
  let menuItems = ALL_MENU_ITEMS.filter(item => item.allowedRoles.includes(user.role) || item.allowedRoles.includes(role))

  if (!isPaid) {
    menuItems = menuItems.filter(item => !HIDDEN_IN_FREE_MODE.includes(item.path)).map(item => {
      if (item.path === '/payments') {
        return { ...item, badge: isBlocked ? '🚨 BLOQUEADO' : '💎 PLANES' }
      }
      if (item.path === '/settings') {
        return { ...item, badge: '1 MÓVIL' }
      }
      return item
    })
  }

  const handleLogoutClick = () => {
    if (typeof onLogout === 'function') onLogout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-[#0a0f1d] text-slate-200 flex flex-col transition-transform duration-300 transform border-r border-slate-800/80 shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        {/* ── Header ── */}
        <div className="p-5 pb-4 border-b border-slate-800/80 bg-[#080c18]">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-black text-sm shadow-inner">
                🛡️
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-white uppercase font-mono">
                  EINSOFT GPS
                </h1>
                <span className="text-[9px] text-slate-500 font-semibold tracking-widest block uppercase">
                  Telematics & Security SOC
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400 hover:text-white transition-colors">✕</button>
          </div>

          {/* User info card - Sober corporate layout */}
          <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-100 truncate">{user.name || user.email || 'Operador Central'}</p>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <p className="text-[11px] text-slate-400 truncate font-mono">{user.email || 'soc@einsoftgps.com'}</p>
            <div className="pt-0.5">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider block text-center ${roleInfo.badge}`}>
                {roleInfo.label}
              </span>
            </div>

            {/* Subscription & Daily Usage Widget */}
            {!isPaid ? (
              <div className="mt-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-amber-400 flex items-center gap-1">
                    <span>⚡</span> Modo Gratuito
                  </span>
                  <span className={`font-mono px-1.5 py-0.2 rounded text-[9px] ${
                    isBlocked ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {queriesUsed}/1 HOY
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 mt-1.5 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${isBlocked ? 'bg-red-500' : 'bg-cyan-400'}`}
                    style={{ width: `${Math.min(100, queriesUsed * 100)}%` }}
                  />
                </div>
                <Link
                  to="/payments"
                  onClick={() => setIsOpen(false)}
                  className="mt-1.5 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center justify-between transition-colors pt-0.5"
                >
                  <span>{isBlocked ? '🚨 Límite alcanzado' : '💎 Activar Ilimitado'}</span>
                  <span>→</span>
                </Link>
              </div>
            ) : (
              <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Membresía 24/7
                </span>
                <span className="text-[9px] font-mono text-slate-400 uppercase truncate max-w-[90px]">
                  {planName || 'ACTIVA'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Navigation Menu ── */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
          {menuItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)

            if (item.external) {
              return (
                <a
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 group text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-xs font-medium"
                >
                  <span className="text-base opacity-75 group-hover:opacity-100">{item.icon}</span>
                  <span className="tracking-tight flex-1 font-semibold">{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 rounded tracking-wider uppercase">
                      {item.badge}
                    </span>
                  )}
                </a>
              )
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 text-xs group ${
                  isActive
                    ? 'bg-slate-800/90 text-white font-bold border-l-2 border-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 font-medium'
                }`}
              >
                <span className={`text-base transition-opacity ${isActive ? 'opacity-100 text-cyan-400' : 'opacity-70 group-hover:opacity-100'}`}>
                  {item.icon}
                </span>
                <span className="tracking-tight flex-1">{item.label}</span>
                {item.badge && (
                  <span className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded tracking-wider uppercase ${
                    isActive ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* ── Footer ── */}
        <div className="p-3 border-t border-slate-800/80 bg-[#080c18]">
          <button
            onClick={handleLogoutClick}
            className="w-full px-3 py-2 bg-slate-900 hover:bg-red-950/40 hover:text-red-300 text-slate-400 rounded-xl text-xs font-semibold border border-slate-800/80 hover:border-red-900/40 transition-all flex items-center justify-center gap-2"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
