import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

const severities = ['all', 'low', 'medium', 'high', 'critical']
const statuses = ['all', 'unacknowledged', 'acknowledged']

const severityColors = {
  critical: 'bg-red-950 text-red-300 border-red-800/60',
  high: 'bg-amber-950 text-amber-300 border-amber-800/60',
  medium: 'bg-slate-800 text-slate-200 border-slate-700',
  low: 'bg-slate-900 text-slate-400 border-slate-800',
}

const typeIcon = (type) => {
  if (type === 'panic') return '🚨'
  if (type === 'speeding') return '⚡'
  if (type === 'security') return '🔒'
  if (type === 'geofence') return '🗺️'
  return '⚠️'
}

export default function Alerts() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ severity: 'all', status: 'all' })
  const [now, setNow] = useState(Date.now())

  // Refresh time label every 30 seconds
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
    { refetchInterval: 10000 },
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
    <div className="space-y-6 text-slate-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase block mb-1">
            Centro de Operaciones de Seguridad (SOC)
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>⚠️</span> Registro de Incidentes & Alertas Críticas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoreo en tiempo real de eventos de pánico SOS, colisiones, excesos de velocidad y perfiles de seguridad.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            TOTAL: <span className="text-cyan-400 font-bold">{alerts.length}</span> EVENTOS
          </div>
          {criticalAlerts.length > 0 && (
            <div className="px-3.5 py-1.5 rounded-xl bg-red-950/80 border border-red-800/60 text-xs font-mono text-red-300 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>{criticalAlerts.length} CRÍTICAS ACTIVAS</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== PANEL DE INCIDENTES CRÍTICOS (SOC LEVEL) ===== */}
      {criticalAlerts.length > 0 && (
        <div className="rounded-2xl border border-red-800/70 bg-[#12070a] overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between bg-red-950/80 px-5 py-3 border-b border-red-900/60">
            <div className="flex items-center gap-2.5">
              <span className="text-base text-red-400 font-mono font-black">🚨 ACCIÓN PRIORITARIA</span>
              <span className="text-red-200 font-bold text-xs">
                ({criticalAlerts.length}) Incidente{criticalAlerts.length > 1 ? 's' : ''} Crítico{criticalAlerts.length > 1 ? 's' : ''} sin atender
              </span>
            </div>
            <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">Protocolo 24/7 Activo</span>
          </div>
          <div className="divide-y divide-red-950/80">
            {criticalAlerts.map((alert) => (
              <div key={alert._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-3.5 hover:bg-red-950/20 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="text-xl mt-0.5">{typeIcon(alert.type)}</div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-100 text-xs leading-tight">{alert.message}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
                      <span className="text-red-400 font-bold">Móvil: {alert.vehicle?.licensePlate || 'N/A'}</span>
                      {alert.location?.latitude && (
                        <span>Coords: {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}</span>
                      )}
                      <span className="text-slate-500">{timeAgo(alert.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => acknowledgeMutation.mutate(alert._id)}
                  disabled={acknowledgeMutation.isLoading}
                  className="shrink-0 px-4 py-2 bg-red-900 hover:bg-red-800 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all border border-red-700/60 disabled:opacity-50"
                >
                  Confirmar Atendido ✓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== FILTROS Y REGISTRO GENERAL ===== */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4 text-xs">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="block text-slate-400 font-mono text-[10px] uppercase tracking-wider">Severidad</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 capitalize focus:border-cyan-500 outline-none"
              >
                {severities.map(s => (
                  <option key={s} value={s} className="capitalize">{s === 'all' ? 'Todas' : s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-slate-400 font-mono text-[10px] uppercase tracking-wider">Estado de Gestión</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:border-cyan-500 outline-none"
              >
                <option value="all">Todos los Estados</option>
                <option value="unacknowledged">Sin Atender</option>
                <option value="acknowledged">Atendidas</option>
              </select>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Actualización automática cada 10s</span>
        </div>

        {/* ===== TABLA DE INCIDENTES ===== */}
        <div className="pt-2">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">Consultando base de eventos...</div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">No se registran eventos con los filtros seleccionados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#080c18] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Fecha / Hora</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Tipo de Evento</th>
                    <th className="px-4 py-3">Severidad</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {alerts.map((alert) => (
                    <tr
                      key={alert._id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        alert.severity === 'critical' && !alert.acknowledged
                          ? 'bg-red-950/15'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-[11px] text-slate-400 font-mono">
                        {new Date(alert.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-200">
                        {alert.vehicle?.licensePlate || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 font-medium text-slate-300">
                          <span>{typeIcon(alert.type)}</span>
                          <span className="capitalize">{alert.type === 'panic' ? 'Botón Pánico SOS' : alert.type?.replace(/_/g, ' ')}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-wider ${severityColors[alert.severity] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {alert.acknowledged ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                            ✓ Atendido
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-800/60 uppercase">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!alert.acknowledged && (
                          <button
                            onClick={() => acknowledgeMutation.mutate(alert._id)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-[11px] font-semibold transition"
                          >
                            Marcar Leído
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
