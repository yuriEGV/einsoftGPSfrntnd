import React from 'react'
import { getDeviceConnectionStatus } from '../utils/deviceState'

export default function StatsDashboard({ vehicles = [], alerts = [] }) {
  // Dynamically compute the 3 connection states for the entire fleet
  let onlineCount = 0
  let staleCount = 0
  let offlineCount = 0
  let alertCount = 0

  for (const v of vehicles) {
    if (v.status === 'alert') {
      alertCount++
    }
    const conn = getDeviceConnectionStatus(v.lastUpdate)
    if (conn.status === 'online') onlineCount++
    else if (conn.status === 'stale') staleCount++
    else offlineCount++
  }

  const unackAlerts = alerts.filter(a => !a.acknowledged).length

  const stats = [
    {
      label: '🟢 Online (<30s)',
      subtext: 'Transmisión activa en vivo',
      value: onlineCount,
      color: 'text-emerald-600',
      badgeClass: 'bg-emerald-50 border border-emerald-200',
      icon: '🟢',
    },
    {
      label: '🟡 Sin Actualización (30s-3m)',
      subtext: 'Demora o señal intermitente',
      value: staleCount,
      color: 'text-amber-600',
      badgeClass: 'bg-amber-50 border border-amber-200',
      icon: '🟡',
    },
    {
      label: '🔴 Offline (>3min)',
      subtext: 'Desconectados o apagados',
      value: offlineCount,
      color: 'text-red-600',
      badgeClass: 'bg-red-50 border border-red-200',
      icon: '🔴',
    },
    {
      label: '🚨 Alertas y Pánicos',
      subtext: alertCount > 0 ? `⚠️ ${alertCount} pánicos activos` : 'Sin emergencias',
      value: unackAlerts + alertCount,
      color: alertCount > 0 ? 'text-red-600 font-black animate-pulse' : 'text-gray-900',
      badgeClass: alertCount > 0 ? 'bg-red-100 border border-red-300' : 'bg-slate-50 border border-slate-200',
      icon: alertCount > 0 ? '🆘' : '🔔',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div key={idx} className={`card p-4 rounded-2xl ${stat.badgeClass} shadow-sm transition-all hover:shadow-md`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-700 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
              <p className={`text-3xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] text-gray-500 mt-1">{stat.subtext}</p>
            </div>
            <div className="text-2xl">{stat.icon}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
