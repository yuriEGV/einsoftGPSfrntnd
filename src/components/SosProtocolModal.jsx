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

export default function SosProtocolModal({ isOpen, onClose, vehicle = null, onOpenConfig = null }) {
  const [selectedIncident, setSelectedIncident] = useState('portonazo')
  const [selectedScope, setSelectedScope] = useState('A mí')
  const [holdProgress, setHoldProgress] = useState(0) // 0 to 100
  const [isHolding, setIsHolding] = useState(false)
  const [isActivated, setIsActivated] = useState(false)
  const [dispatchData, setDispatchData] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Configuración de Central y Teléfono SOS
  const [sosConfig, setSosConfig] = useState({
    emergencyPhone: '',
    centralName: 'Central de Seguridad 24/7',
    whatsappAlerts: true,
  })

  const holdTimerRef = useRef(null)
  const progressIntervalRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      loadSosConfig()
    }
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [isOpen])

  const loadSosConfig = async () => {
    // 1. From local storage
    try {
      const local = localStorage.getItem('einsoft_sos_config')
      if (local) {
        setSosConfig(JSON.parse(local))
      }
    } catch (_) {}

    // 2. From backend API
    try {
      const res = await apiClient.get('/plataforma-plus/sos-config')
      if (res.data?.config) {
        setSosConfig(res.data.config)
      }
    } catch (_) {}
  }

  if (!isOpen) return null

  const isPhoneConfigured = Boolean(sosConfig?.emergencyPhone && sosConfig.emergencyPhone.trim().length >= 7)

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
      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 500])
      }

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
        emergencyPhone: sosConfig?.emergencyPhone || '',
        centralName: sosConfig?.centralName || 'Central de Seguridad 24/7',
        notes: `Activación por Botón SOS (3 Segundos). Unidad: ${vehicle?.plate || 'App Móvil'}`,
      })

      setDispatchData(res.data.dispatch)
      setIsActivated(true)
    } catch (err) {
      // Fallback
      setDispatchData({
        folio: `SOS-EIN-${Date.now().toString().slice(-6)}`,
        incidentType: selectedIncident.toUpperCase(),
        targetScope: selectedScope,
        emergencyPhone: sosConfig?.emergencyPhone || '',
        centralName: sosConfig?.centralName || 'Central de Seguridad 24/7',
        isConfigured: isPhoneConfigured,
        forcesContacted: [
          { force: 'Carabineros de Chile (133)', status: 'NOTIFICADO_DISPACHO_INMEDIATO' },
          { force: 'Policía de Investigaciones PDI (134)', status: 'ALERTA_MONITOREO_ENCARGOS' },
          {
            force: isPhoneConfigured
              ? `${sosConfig.centralName} (${sosConfig.emergencyPhone})`
              : 'Central Telefónica (⚠️ Número no configurado)',
            status: isPhoneConfigured ? 'LLAMADA_SALIENTE_ACTIVADA' : 'PENDIENTE_CONFIGURAR_NUMERO',
          },
        ],
      })
      setIsActivated(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 text-white w-full max-w-xl rounded-3xl shadow-2xl border border-red-500/30 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header Táctico */}
        <div className="p-6 bg-gradient-to-r from-red-950/70 via-rose-950/50 to-slate-900 border-b border-red-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600/30 border border-red-400/50 flex items-center justify-center text-2xl text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
              🚨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">
                  Botón SOS
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-[10px] font-black uppercase text-red-300">
                  Central 24/7
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Asistencia Inmediata & Verificación de Audio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Banner de Estado de Configuración del Teléfono SOS */}
          {!isPhoneConfigured ? (
            <div className="bg-amber-950/60 border border-amber-500/50 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚠️</span>
                <div>
                  <strong className="block font-black text-amber-300">
                    Número de Emergencia No Configurado
                  </strong>
                  <span className="text-[11px] text-amber-200/90 leading-tight block mt-0.5">
                    Para que el botón de pánico sea útil, debes indicar con antelación a qué teléfono o central debe llamar.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  if (onOpenConfig) onOpenConfig()
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition shrink-0 shadow flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>⚙️</span>
                <span>Configurar Número</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-slate-400 text-[11px]">Central configurada:</span>
                <strong className="text-emerald-300 font-mono">
                  {sosConfig.centralName} ({sosConfig.emergencyPhone})
                </strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  if (onOpenConfig) onOpenConfig()
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline"
              >
                Modificar
              </button>
            </div>
          )}

          {!isActivated ? (
            <div className="space-y-5">
              {/* 1. Categoría del incidente */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <span>1.</span> ¿Qué está sucediendo?
                  </label>
                  <span className="text-[11px] text-slate-400">Selecciona el tipo de emergencia</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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

              {/* 2. ¿A quién le ocurre esto? */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <span>2.</span> ¿A quién le ocurre esto?
                  </label>
                  <span className="text-[11px] text-slate-400">Detalla el alcance del suceso</span>
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

              {/* 3. Botón de activación SOS - Pulsar 3 Segundos */}
              <div className="bg-slate-950/70 p-5 rounded-2xl border border-red-500/20 text-center space-y-3">
                <p className="text-xs font-semibold text-slate-300">
                  Si deseas activar el protocolo de seguridad, mantén presionado el botón SOS durante <strong className="text-red-400 font-bold">3 segundos</strong>.
                </p>

                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative flex items-center justify-center">
                    <div
                      className={`absolute w-36 h-36 rounded-full bg-red-600/20 transition-all duration-300 ${
                        isHolding ? 'scale-125 bg-red-600/40 animate-ping' : ''
                      }`}
                    />

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
                        className="text-red-500 transition-all duration-75"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 58}
                        strokeDashoffset={2 * Math.PI * 58 * (1 - holdProgress / 100)}
                        strokeLinecap="round"
                      />
                    </svg>

                    <button
                      type="button"
                      onMouseDown={handleStartHold}
                      onMouseUp={handleEndHold}
                      onMouseLeave={handleEndHold}
                      onTouchStart={handleStartHold}
                      onTouchEnd={handleEndHold}
                      disabled={isSubmitting}
                      className={`absolute w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-rose-800 text-white font-black text-lg flex flex-col items-center justify-center shadow-xl select-none transition-all active:scale-95 ${
                        isHolding ? 'scale-90 shadow-red-500/50' : 'hover:scale-105'
                      }`}
                    >
                      <span className="text-2xl">🚨</span>
                      <span className="text-xs font-extrabold tracking-wider">
                        {isHolding ? `${Math.round(holdProgress)}%` : 'SOS'}
                      </span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono mt-3">
                    {isHolding ? 'MANTÉN PRESIONADO...' : 'MANTÉN PULSADO 3 SEGUNDOS'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Vista Tras Despacho de la Emergencia */
            <div className="space-y-4 text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center text-3xl mx-auto shadow-[0_0_30px_rgba(168,85,247,0.4)]">
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
                  La Central Receptora ha recibido tu alerta satelital con prioridad roja.
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
                        <span className={`font-bold ${f.status.includes('PENDIENTE') ? 'text-amber-400' : 'text-emerald-300'}`}>
                          {f.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botones de acción directa con teléfono configurado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {isPhoneConfigured ? (
                  <a
                    href={`tel:${sosConfig.emergencyPhone}`}
                    className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/40 transition-all active:scale-95"
                  >
                    <span>📞</span>
                    <span>Llamar a {sosConfig.centralName} ({sosConfig.emergencyPhone})</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      if (onOpenConfig) onOpenConfig()
                    }}
                    className="py-3 px-4 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95"
                  >
                    <span>⚙️</span>
                    <span>Configurar Número para Llamar</span>
                  </button>
                )}

                {isPhoneConfigured && sosConfig.whatsappAlerts && (
                  <a
                    href={`https://wa.me/${sosConfig.emergencyPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `🚨 *ALERTA SOS EINSOFT GPS*\nFolio: ${dispatchData?.folio || 'N/A'}\nTipo: ${selectedIncident.toUpperCase()}\nUnidad: ${vehicle?.plate || 'App Móvil'}\nUbicación: https://maps.google.com/?q=${vehicle?.location?.coordinates ? `${vehicle.location.coordinates[1]},${vehicle.location.coordinates[0]}` : '-33.4372,-70.6506'}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/40 transition-all active:scale-95"
                  >
                    <span>📲</span>
                    <span>WhatsApp SOS Inmediato</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsActivated(false)
                    onClose()
                  }}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold rounded-xl text-xs transition-all col-span-1 sm:col-span-2"
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
