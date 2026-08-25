import React, { useState } from 'react'
import { useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

export default function AlertsPanel({ alerts = [] }) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'resolved'
  const [actionLoading, setActionLoading] = useState(false)

  // 1. Separate Pending (Unacknowledged) and Resolved (Acknowledged) Alerts
  const pendingAlerts = alerts.filter(a => !a.acknowledged)
  const resolvedAlerts = alerts.filter(a => a.acknowledged)

  // 2. Mutations
  const acknowledgeMutation = useMutation(
    (alertId) => apiClient.post(`/alerts/${alertId}/acknowledge`, { notes: 'Atendida desde panel' }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('alerts')
        queryClient.invalidateQueries('vehicles')
        queryClient.invalidateQueries('peopleTrackers')
      },
    }
  )

  const deleteMutation = useMutation(
    (alertId) => apiClient.delete(`/alerts/${alertId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('alerts')
      },
    }
  )

  const handleAcknowledgeAll = async () => {
    try {
      setActionLoading(true)
      await apiClient.post('/alerts/acknowledge-all')
      queryClient.invalidateQueries('alerts')
    } catch (err) {
      console.error('Error acknowledge all:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolvePanicAll = async () => {
    try {
      setActionLoading(true)
      await apiClient.post('/alerts/resolve-panic-all')
      queryClient.invalidateQueries('alerts')
      queryClient.invalidateQueries('vehicles')
      queryClient.invalidateQueries('peopleTrackers')
    } catch (err) {
      console.error('Error resolve panic all:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const currentList = activeTab === 'pending' ? pendingAlerts : resolvedAlerts

  const getSeverityStyle = (severity, type) => {
    if (type === 'panic' || severity === 'critical') {
      return {
        bg: 'bg-rose-50 border-rose-200 text-rose-900',
        badge: 'bg-rose-600 text-white',
        icon: '🚨',
      }
    }
    if (severity === 'high') {
      return {
        bg: 'bg-amber-50 border-amber-200 text-amber-900',
        badge: 'bg-amber-500 text-white',
        icon: '⚠️',
      }
    }
    return {
      bg: 'bg-slate-50 border-slate-200 text-slate-800',
      badge: 'bg-blue-600 text-white',
      icon: 'ℹ️',
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
      {/* ── Header & Action Controls ── */}
      <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚨</span>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight">Centro de Alertas & SOS</h2>
            <p className="text-[10px] text-slate-500">Notificaciones de pánicos, velocidad y geocercas</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {pendingAlerts.length > 0 && (
            <>
              <button
                onClick={handleResolvePanicAll}
                disabled={actionLoading}
                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black rounded-lg transition shadow-xs flex items-center gap-1"
                title="Desactivar todas las alarmas de pánico SOS activas"
              >
                <span>🚨</span> Apagar Pánicos
              </button>
              <button
                onClick={handleAcknowledgeAll}
                disabled={actionLoading}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                title="Marcar todas las alertas pendientes como atendidas"
              >
                <span>✓</span> Atender Todas
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Tab Switcher: Pendientes vs Atendidas ── */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🔔 Pendientes</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            pendingAlerts.length > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-200 text-slate-600'
          }`}>
            {pendingAlerts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('resolved')}
          className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === 'resolved'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>✔️ Atendidas</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-600">
            {resolvedAlerts.length}
          </span>
        </button>
      </div>

      {/* ── Alerts List ── */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {currentList.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs space-y-1">
            <span className="text-2xl block">🎉</span>
            <p className="font-bold text-slate-600">
              {activeTab === 'pending' ? 'No hay alertas pendientes por atender' : 'No hay historial de alertas atendidas'}
            </p>
            <p className="text-[10px] text-slate-400">Todo el sistema opera con normalidad.</p>
          </div>
        ) : (
          currentList.map((alert) => {
            const style = getSeverityStyle(alert.severity, alert.type)
            const timeStr = alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''
            const dateStr = alert.createdAt ? new Date(alert.createdAt).toLocaleDateString() : ''

            return (
              <div
                key={alert._id || alert.id}
                className={`p-3 rounded-xl border text-xs transition-all space-y-2 ${style.bg}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{style.icon}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${style.badge}`}>
                      {alert.type?.replace(/_/g, ' ') || 'ALERTA'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500" title={dateStr}>
                    🕒 {timeStr}
                  </span>
                </div>

                <p className="text-xs font-semibold leading-snug">{alert.message}</p>

                {alert.location?.address && (
                  <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                    <span>📍</span> {alert.location.address}
                  </p>
                )}

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-black/5">
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeMutation.mutate(alert._id || alert.id)}
                      disabled={acknowledgeMutation.isLoading}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition shadow-xs flex items-center gap-1"
                    >
                      <span>✓</span> Marcar Atendida
                    </button>
                  )}

                  <button
                    onClick={() => deleteMutation.mutate(alert._id || alert.id)}
                    disabled={deleteMutation.isLoading}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                    title="Eliminar registro"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
