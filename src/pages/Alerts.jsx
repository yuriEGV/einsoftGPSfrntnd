import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

const severities = ['all', 'low', 'medium', 'high', 'critical']
const statuses = ['all', 'unacknowledged', 'acknowledged']

const severityColors = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-blue-100 text-blue-800 border-blue-300',
}

const typeIcon = (type) => {
  if (type === 'panic') return '🚨'
  if (type === 'speeding') return '💨'
  if (type === 'security') return '🔒'
  if (type === 'geofence') return '🛰️'
  return '⚠️'
}

export default function Alerts() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ severity: 'all', status: 'all' })
  const [now, setNow] = useState(Date.now())

  // Refresh time label every minute
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const { data: alerts = [], isLoading } = useQuery(
    ['alerts-list', filters],
    async () => {
      const response = await apiClient.get('/alerts', {
        params: {
          severity: filters.severity,
          status: filters.status,
          limit: 100,
        },
      })
      return response.data
    },
    { refetchInterval: 10000 }, // Poll every 10s to catch real-time panics
  )

  const acknowledgeMutation = useMutation(
    (alertId) => apiClient.post(`/alerts/${alertId}/acknowledge`, { notes: '' }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('alerts-list')
        queryClient.invalidateQueries('alerts')
      },
    },
  )

  // Critical / panic alerts that are not yet acknowledged
  const criticalAlerts = alerts.filter(
    (a) => (a.severity === 'critical' || a.type === 'panic') && !a.acknowledged
  )

  const timeAgo = (date) => {
    const diff = Math.floor((now - new Date(date)) / 1000)
    if (diff < 60) return `hace ${diff}s`
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Alertas</h1>
          <p className="text-sm text-gray-500 mt-1">
            {alerts.length} alertas en total •{' '}
            <span className={criticalAlerts.length > 0 ? 'text-red-600 font-bold animate-pulse' : 'text-gray-400'}>
              {criticalAlerts.length} críticas sin atender
            </span>
          </p>
        </div>
      </div>

      {/* ===== PANEL DE ALERTAS CRÍTICAS ===== */}
      {criticalAlerts.length > 0 && (
        <div className="rounded-2xl border-2 border-red-400 bg-red-50 overflow-hidden shadow-lg shadow-red-100">
          <div className="flex items-center gap-3 bg-red-600 px-5 py-3">
            <span className="text-xl animate-bounce">🚨</span>
            <span className="text-white font-black text-sm tracking-widest uppercase">
              {criticalAlerts.length} Alerta{criticalAlerts.length > 1 ? 's' : ''} Crítica{criticalAlerts.length > 1 ? 's' : ''} — Acción Inmediata Requerida
            </span>
            <div className="ml-auto w-3 h-3 rounded-full bg-white animate-ping" />
          </div>
          <div className="divide-y divide-red-200">
            {criticalAlerts.map((alert) => (
              <div key={alert._id} className="flex items-start gap-4 px-5 py-4">
                <div className="text-2xl mt-0.5">{typeIcon(alert.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-red-900 text-sm leading-tight">{alert.message}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs text-red-700 font-mono">
                      🚗 {alert.vehicle?.licensePlate || 'N/A'}
                    </span>
                    {alert.location?.latitude ? (
                      <span className="text-xs text-red-600">
                        📍 {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
                      </span>
                    ) : null}
                    <span className="text-xs text-red-500 font-mono">{timeAgo(alert.createdAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => acknowledgeMutation.mutate(alert._id)}
                  disabled={acknowledgeMutation.isLoading}
                  className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl uppercase tracking-widest transition-all shadow-md disabled:opacity-50"
                >
                  Atendido ✓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== FILTROS ===== */}
      <div className="card">
        <div className="p-4 flex flex-wrap gap-4 text-sm">
          <div>
            <label className="block text-gray-700 mb-1 font-medium text-xs uppercase tracking-wider">Severidad</label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 capitalize"
            >
              {severities.map(s => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-1 font-medium text-xs uppercase tracking-wider">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== TABLA ===== */}
        <div className="border-t border-gray-200">
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500">Cargando alertas...</div>
          ) : alerts.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No hay alertas.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-700 font-medium">Hora</th>
                  <th className="px-4 py-2 text-left text-gray-700 font-medium">Vehículo</th>
                  <th className="px-4 py-2 text-left text-gray-700 font-medium">Tipo</th>
                  <th className="px-4 py-2 text-left text-gray-700 font-medium">Severidad</th>
                  <th className="px-4 py-2 text-left text-gray-700 font-medium">Estado</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr
                    key={alert._id}
                    className={`border-t border-gray-100 ${alert.severity === 'critical' && !alert.acknowledged
                      ? 'bg-red-50'
                      : ''}`}
                  >
                    <td className="px-4 py-2 text-xs text-gray-500 font-mono">
                      {new Date(alert.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 font-mono font-bold">
                      {alert.vehicle?.licensePlate || 'N/A'}
                    </td>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-1">
                        <span>{typeIcon(alert.type)}</span>
                        <span className={`capitalize font-medium ${alert.type === 'panic' ? 'text-red-700 font-black' : ''}`}>
                          {alert.type === 'panic' ? 'PÁNICO' : alert.type?.replace(/_/g, ' ')}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border capitalize ${severityColors[alert.severity] || 'bg-gray-100 text-gray-700'}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {alert.acknowledged ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 font-medium">
                          ✓ Atendido
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 font-bold animate-pulse">
                          Activa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeMutation.mutate(alert._id)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium"
                        >
                          Marcar leído
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
