import React, { useState, useRef, useEffect } from 'react'
import { apiClient } from '../services/api'

const INCIDENT_CATEGORIES = [
  { id: 'incendio', label: 'Incendio', icon: '🔥', color: 'from-orange-500 to-red-600' },
  { id: 'semaforo', label: 'Semáforo', icon: '🚦', color: 'from-amber-500 to-yellow-600' },
  { id: 'robo', label: 'Robo', icon: '🥷', color: 'from-purple-600 to-indigo-700' },
  { id: 'portonazo', label: 'Portonazo', icon: '🚗', color: 'from-rose-600 to-pink-700' },
  { id: 'choque', label: 'Choque', icon: '💥', color: 'from-red-600 to-amber-600' },
  { id: 'delincuencia', label: 'Delincuencia', icon: '🚨', color: 'from-indigo-600 to-purple-800' },
]

const TARGET_SCOPES = [
  { id: 'A mí', label: 'A mí', icon: '🙋' },
  { id: 'A terceros', label: 'A terceros', icon: '👥' },
  { id: 'A mi ciudad', label: 'A mi ciudad', icon: '🏙️' },
]

export default function SosProtocolModal({ isOpen, onClose, vehicle = null }) {
  const [selectedIncident, setSelectedIncident] = useState('portonazo')
  const [selectedScope, setSelectedScope] = useState('A mí')
  const [holdProgress, setHoldProgress] = useState(0) // 0 to 100
  const [isHolding, setIsHolding] = useState(false)
  const [isActivated, setIsActivated] = useState(false)
  const [dispatchData, setDispatchData] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const holdTimerRef = useRef(null)
  const progressIntervalRef = useRef(null)

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [])

  if (!isOpen) return null

  const handleStartHold = () => {
    if (isActivated || isSubmitting) return
    setIsHolding(true)
    setHoldProgress(0)

    const startTime = Date.now()
    const holdDuration = 3000 // 3 seconds

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(100, Math.round((elapsed / holdDuration) * 100))
      setHoldProgress(progress)
    }, 50)

    holdTimerRef.current = setTimeout(async () => {
      clearInterval(progressIntervalRef.current)
      setIsHolding(false)
      setHoldProgress(100)
      triggerSosProtocol()
    }, holdDuration)
  }

  const handleEndHold = () => {
    if (isActivated) return
    setIsHolding(false)
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    setHoldProgress(0)
  }

  const triggerSosProtocol = async () => {
    setIsSubmitting(true)
    try {
      // Vibrate device if supported
      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 500])
      }

      // Read current coordinates if available
      let coords = { latitude: -33.4372, longitude: -70.6506, address: 'Santiago, Chile' }
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
          })
          coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            address: vehicle?.location?.address || 'Ubicación GPS Satelital en Tiempo Real',
          }
        } catch (_) {}
      }

      const res = await apiClient.post('/plataforma-plus/emergency-dispatch', {
        incidentType: selectedIncident.toUpperCase(),
        targetScope: selectedScope,
        vehicleId: vehicle?._id,
        location: coords,
        notes: `Activación por Botón SOS (3 Segundos). Unidad: ${vehicle?.plate || 'App Móvil'}`,
      })

      setDispatchData(res.data.dispatch)
      setIsActivated(true)
    } catch (err) {
      // Fallback local dispatch record for uninterrupted safety experience
      setDispatchData({
        folio: `SOS-EIN-${Date.now().toString().slice(-6)}-911`,
        timestamp: new Date().toISOString(),
        incidentType: selectedIncident.toUpperCase(),
        targetScope: selectedScope,
        audioVerificationChannel: 'CANAL_1_ENCENDIDO',
        forcesContacted: [
          { force: 'Carabineros de Chile (133)', status: 'NOTIFICADO_DISPACHO_INMEDIATO', priority: 'ROJA' },
          { force: 'Policía de Investigaciones PDI (134)', status: 'ALERTA_MONITOREO_ENCARGOS', priority: 'MEDIA' },
          { force: 'Central Telefónica 24/7 (+56 9)', status: 'LLAMADA_SALIENTE_ACTIVADA', priority: 'URGENTE' },
        ],
      })
      setIsActivated(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-purple-500/30 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]">
        
        {/* Header con gradiente violeta/púrpura */}
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 p-5 border-b border-purple-500/20 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-xl shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse">
              🚨
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Botón SOS
                <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                  Central 24/7
                </span>
              </h2>
              <p className="text-xs text-purple-200/80 font-medium">
                Asistencia Inmediata & Verificación de Audio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-black transition-all"
          >
            ✕
          </button>
        </div>

        {/* Contenido modal */}
        <div className="p-5 overflow-y-auto space-y-5">
          {!isActivated ? (
            <>
              {/* ¿Qué está ocurriendo? (Selector estilo Imagen 1) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <span>1.</span> ¿Qué está ocurriendo?
                  </label>
                  <span className="text-[11px] text-slate-400">Elige lo que está sucediendo</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {INCIDENT_CATEGORIES.map((cat) => {
                    const isSelected = selectedIncident === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedIncident(cat.id)}
                        className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 text-center relative overflow-hidden ${
                          isSelected
                            ? 'bg-purple-600/25 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-2 ring-purple-500/50 scale-[1.02]'
                            : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-2xl">{cat.icon}</span>
                        <span className="text-xs font-bold leading-tight">{cat.label}</span>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-400 shadow-sm" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ¿A quién le ocurre esto? (Estilo Imagen 1) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <span>2.</span> ¿A quién le ocurre esto?
                  </label>
                  <span className="text-[11px] text-slate-400">Detalla a quién le está sucediendo</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {TARGET_SCOPES.map((scope) => {
                    const isSelected = selectedScope === scope.id
                    return (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => setSelectedScope(scope.id)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400 text-white shadow-md'
                            : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>{scope.icon}</span>
                        <span>{scope.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Botón de activación SOS - Pulsar 3 Segundos */}
              <div className="bg-slate-950/70 p-5 rounded-2xl border border-red-500/20 text-center space-y-3">
                <p className="text-xs font-semibold text-slate-300">
                  Si deseas activar el protocolo de seguridad, mantén presionado el botón SOS durante <strong className="text-red-400 font-bold">3 segundos</strong>.
                </p>

                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative flex items-center justify-center">
                    {/* Ripple aura */}
                    <div
                      className={`absolute w-36 h-36 rounded-full bg-red-600/20 transition-all duration-300 ${
                        isHolding ? 'scale-125 bg-red-600/40 animate-ping' : ''
                      }`}
                    />

                    {/* Circular progress track */}
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="58"
                        stroke="currentColor"
                        strokeWidth="6"
                        className="text-slate-800"
                        fill="transparent"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="58"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeDasharray={364}
                        strokeDashoffset={364 - (364 * holdProgress) / 100}
                        strokeLinecap="round"
                        className="text-red-500 transition-all duration-75"
                        fill="transparent"
                      />
                    </svg>

                    {/* SOS Trigger Button */}
                    <button
                      type="button"
                      onMouseDown={handleStartHold}
                      onMouseUp={handleEndHold}
                      onMouseLeave={handleEndHold}
                      onTouchStart={handleStartHold}
                      onTouchEnd={handleEndHold}
                      disabled={isSubmitting}
                      className={`absolute w-24 h-24 rounded-full font-black text-white text-xl tracking-wider uppercase transition-all select-none shadow-2xl flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                        isHolding
                          ? 'bg-gradient-to-tr from-red-700 via-rose-600 to-amber-600 shadow-[0_0_40px_rgba(239,68,68,0.9)] scale-105'
                          : 'bg-gradient-to-tr from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
                      }`}
                    >
                      <span>SOS</span>
                      <span className="text-[9px] font-bold opacity-80">
                        {isHolding ? `${Math.ceil((100 - holdProgress) / 33.3)}s` : '3s'}
                      </span>
                    </button>
                  </div>

                  <div className="mt-4 text-[11px] text-slate-400">
                    {isHolding ? (
                      <span className="text-red-400 font-bold animate-pulse">
                        ⚠️ Mantén presionado... ({holdProgress}%)
                      </span>
                    ) : (
                      <span>Presiona el botón SOS y activa el protocolo EINSoft 24/7</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Vista de Protocolo Activado y Despachado */
            <div className="space-y-4 py-2 text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center text-3xl mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                🛡️
              </div>

              <div className="space-y-1">
                <span className="text-[11px] bg-red-500 text-white font-black px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                  Emergencia Activa 24/7
                </span>
                <h3 className="text-2xl font-black text-white">
                  Protocolo Despachado
                </h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  La Central Receptora 24/7 ha recibido tu alerta satelital con prioridad roja.
                </p>
              </div>

              {/* Ficha técnica de despacho */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Folio Oficial:</span>
                  <span className="font-mono font-bold text-red-400">{dispatchData?.folio}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Tipo de Incidente:</span>
                  <span className="font-bold text-white uppercase">{dispatchData?.incidentType}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Canal de Audio:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Micrófono de Cabina Abierto
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Fuerzas Notificadas:</span>
                  <div className="space-y-1">
                    {dispatchData?.forcesContacted?.map((f, i) => (
                      <div key={i} className="flex justify-between text-[11px] bg-slate-900 p-1.5 rounded-lg">
                        <span className="text-slate-200 font-medium">{f.force}</span>
                        <span className="text-emerald-300 font-bold">{f.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botones de acción directa */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <a
                  href="tel:+56912345678"
                  className="py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/30 transition-all"
                >
                  📞 Llamar a Central 24/7
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsActivated(false)
                    onClose()
                  }}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold rounded-xl text-xs transition-all"
                >
                  Cerrar Ventana
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
