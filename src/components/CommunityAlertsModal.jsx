import React, { useState, useEffect } from 'react'
import { apiClient } from '../services/api'

export default function CommunityAlertsModal({ isOpen, onClose }) {
  const [alerts, setAlerts] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState('portonazo')
  const [newScope, setNewScope] = useState('A mi ciudad')
  const [newDescription, setNewDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadAlerts()
    }
  }, [isOpen])

  const loadAlerts = async () => {
    try {
      const res = await apiClient.get('/plataforma-plus/community-alerts')
      setAlerts(res.data.alerts || [])
    } catch (e) {
      console.warn('Error loading community alerts:', e)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setIsSubmitting(true)
    try {
      await apiClient.post('/plataforma-plus/community-alerts', {
        type: newType,
        title: newTitle,
        description: newDescription,
        scope: newScope,
      })
      setNewTitle('')
      setNewDescription('')
      setIsCreating(false)
      loadAlerts()
    } catch (err) {
      console.warn('Create alert error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const filteredAlerts = filterType === 'all'
    ? alerts
    : alerts.filter(a => a.type === filterType)

  const getTypeBadge = (type) => {
    const map = {
      portonazo: { label: 'Portonazo', icon: '🚗', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
      choque: { label: 'Choque', icon: '💥', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
      robo: { label: 'Robo', icon: '🥷', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      delincuencia: { label: 'Delincuencia', icon: '🚨', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
      semaforo: { label: 'Semáforo', icon: '🚦', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
      incendio: { label: 'Incendio', icon: '🔥', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    }
    return map[type] || { label: type, icon: '⚠️', color: 'bg-slate-700 text-slate-300' }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-purple-500/30 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 p-5 border-b border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-xl text-purple-300">
              👥
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Red Social de Alertas Comunitarias
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                  En Vivo
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Mapa colaborativo en tiempo real contra portonazos, delincuencia y peligros viales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-black"
          >
            ✕
          </button>
        </div>

        {/* Filter Bar & Action */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex gap-1.5 flex-wrap">
            {['all', 'portonazo', 'choque', 'delincuencia', 'robo', 'semaforo'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all capitalize ${
                  filterType === t
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'all' ? 'Todas' : t}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 text-white font-black rounded-xl text-xs flex items-center gap-1 shadow-md transition-all active:scale-95"
          >
            <span>{isCreating ? '✕ Cancelar' : '➕ Nueva Alerta'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Create Alert Form */}
          {isCreating && (
            <form onSubmit={handleCreate} className="bg-slate-950 p-4 rounded-2xl border border-purple-500/30 space-y-3 animate-in fade-in duration-200">
              <h3 className="text-xs font-black text-purple-300 uppercase tracking-wider">
                Publicar Alerta en la Red Comunitaria
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Tipo de Incidente</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="portonazo">🚗 Portonazo / Abordazo</option>
                    <option value="choque">💥 Choque / Accidente</option>
                    <option value="delincuencia">🚨 Delincuencia / Asalto</option>
                    <option value="robo">🥷 Robo de Accesorios</option>
                    <option value="semaforo">🚦 Semáforo Apagado</option>
                    <option value="incendio">🔥 Incendio / Emergencia</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Alcance</label>
                  <select
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="A mí">🙋 A mí</option>
                    <option value="A terceros">👥 A terceros</option>
                    <option value="A mi ciudad">🏙️ A mi ciudad</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Título de la Alerta</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Auto sospechoso merodeando esquina..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Detalle o Descripción</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe la situación para alertar a los demás conductores..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl text-xs shadow-md"
                >
                  {isSubmitting ? 'Publicando...' : 'Publicar Inmediatamente'}
                </button>
              </div>
            </form>
          )}

          {/* Alert Feed */}
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No hay alertas activas en esta categoría.
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const badge = getTypeBadge(alert.type)
                return (
                  <div
                    key={alert.id}
                    className="bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 transition-all space-y-2 text-xs shadow-sm"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-black flex items-center gap-1 ${badge.color}`}>
                          <span>{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                        <span className="text-[10px] bg-slate-700/80 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                          {alert.scope}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-white">
                      {alert.title}
                    </h4>

                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {alert.description}
                    </p>

                    <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                      <div className="flex items-center gap-1 text-purple-300">
                        <span>📍</span>
                        <span>{alert.location?.address || 'Santiago, Chile'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">
                          ✓ {alert.votes} Confirmaciones
                        </span>
                        <span className="text-slate-500">Por: {alert.reportedBy}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
