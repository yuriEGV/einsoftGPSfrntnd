import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiClient } from '../services/api'
import { telemetryClient } from '../services/telemetryClient'
import { getDeviceConnectionStatus } from '../utils/deviceState'

// Simple flyTo helper for Leaflet
function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 16, { duration: 1 })
    }
  }, [center, map])
  return null
}

const customIcon = L.icon({
  iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232563eb" width="36px" height="36px"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
})

export default function MobileGpsDashboard({ onLogout }) {
  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}')
  const [customId, setCustomId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const paramId = params.get('id') || params.get('imei') || params.get('user');
      if (paramId) {
        localStorage.setItem('einsoft_mobile_id', paramId);
        return paramId;
      }
    } catch (_) {}
    return localStorage.getItem('einsoft_mobile_id') || user.imei || user.deviceId || user.phone || '350673971668546';
  })
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('einsoft_telemetry_url') || 'https://einsoft-gp-sbcknd.vercel.app/api/telemetry')
  const [frequencySec, setFrequencySec] = useState(() => localStorage.getItem('einsoft_telemetry_freq') || '10')
  const [showSettings, setShowSettings] = useState(true)
  const [pingTestStatus, setPingTestStatus] = useState(null)
  const [isTransmitting, setIsTransmitting] = useState(true)
  const [telemetry, setTelemetry] = useState(null)
  const [lastPacketTime, setLastPacketTime] = useState(null)
  const [offlineCount, setOfflineCount] = useState(0)
  const [isNetOnline, setIsNetOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [packetsSentTotal, setPacketsSentTotal] = useState(0)
  const [gpsPermissionError, setGpsPermissionError] = useState(null)
  
  // Panic Alert state & countdown
  const [panicCountdown, setPanicCountdown] = useState(null)
  const [panicActive, setPanicActive] = useState(false)
  const [panicMessage, setPanicMessage] = useState('')
  const countdownTimer = useRef(null)

  // Start/restart Telemetry Client whenever parameters change
  useEffect(() => {
    if (!isTransmitting) {
      telemetryClient.stop()
      return
    }

    telemetryClient.start({
      deviceId: customId,
      userId: user.id || null,
      trackerCode: customId,
      serverUrl: serverUrl,
      intervalSeconds: Number(frequencySec),
    })

    const unsubscribe = telemetryClient.subscribe((event) => {
      if (event.type === 'telemetry_sample') {
        setTelemetry(event.sample)
        setGpsPermissionError(null)
      } else if (event.type === 'packet_sent') {
        setLastPacketTime(new Date())
        setPacketsSentTotal(prev => prev + 1)
        setOfflineCount(telemetryClient.getOfflineQueueCount())
      } else if (event.type === 'offline_queue_updated') {
        setOfflineCount(event.count)
      } else if (event.type === 'network_status') {
        setIsNetOnline(event.isOnline)
      } else if (event.type === 'sync_completed') {
        setOfflineCount(0)
        setLastPacketTime(new Date())
      } else if (event.type === 'error') {
        setGpsPermissionError(event.message)
      }
    })

    return () => {
      unsubscribe()
      telemetryClient.stop()
    }
  }, [customId, serverUrl, frequencySec, isTransmitting, user.id])

  const handleSaveSettings = (e) => {
    e?.preventDefault()
    localStorage.setItem('einsoft_mobile_id', customId)
    localStorage.setItem('einsoft_telemetry_url', serverUrl)
    localStorage.setItem('einsoft_telemetry_freq', frequencySec)
    telemetryClient.configure({
      deviceId: customId,
      trackerCode: customId,
      serverUrl,
      intervalSeconds: Number(frequencySec),
    })
    setPingTestStatus('💾 Ajustes guardados correctamente')
    setTimeout(() => setPingTestStatus(null), 3000)
  }

  // Trigger Immediate Ping Test
  const handleTestPing = async () => {
    setPingTestStatus('⏳ Enviando señal de prueba...')
    const t0 = Date.now()
    try {
      const point = await telemetryClient.forceImmediateLocation()
      const lat = point?.latitude || -33.0456
      const lng = point?.longitude || -71.6189
      
      const res = await apiClient.post('/telemetry/report', {
        deviceId: customId,
        latitude: lat,
        longitude: lng,
        accuracy: point?.accuracy || 10,
        speed: point?.speed || 0,
        battery: point?.battery || 100,
        timestamp: new Date().toISOString(),
      })

      const elapsed = Date.now() - t0
      setPingTestStatus(`🟢 ¡Ping Exitoso! Respuesta del Servidor: 200 OK (${elapsed}ms)`)
      setLastPacketTime(new Date())
      setPacketsSentTotal(c => c + 1)
    } catch (err) {
      setPingTestStatus(`⚠️ Error en Ping: ${err.response?.data?.error || err.message}`)
    }
  }

  // Periodic check of connection state
  const connStatus = getDeviceConnectionStatus(lastPacketTime)

  // Trigger Panic with accidental cancel window (5 seconds)
  const initiatePanic = () => {
    if (window.navigator?.vibrate) {
      window.navigator.vibrate([200, 100, 200, 100, 400])
    }
    setPanicCountdown(5)
  }

  useEffect(() => {
    if (panicCountdown === null) return
    if (panicCountdown > 0) {
      countdownTimer.current = setTimeout(() => {
        setPanicCountdown(panicCountdown - 1)
      }, 1000)
    } else if (panicCountdown === 0) {
      sendPanicAlert()
      setPanicCountdown(null)
    }
    return () => clearTimeout(countdownTimer.current)
  }, [panicCountdown])

  const cancelPanic = () => {
    clearTimeout(countdownTimer.current)
    setPanicCountdown(null)
    telemetryClient.setEmergencyMode(false)
    setPanicActive(false)
    setPanicMessage('Alerta cancelada')
    setTimeout(() => setPanicMessage(''), 4000)
  }

  const sendPanicAlert = async () => {
    try {
      setPanicActive(true)
      telemetryClient.setEmergencyMode(true)
      await apiClient.post('/alerts/panic', {
        deviceId: customId,
        latitude: telemetry ? telemetry.latitude : null,
        longitude: telemetry ? telemetry.longitude : null,
        address: 'Emergencia enviada desde Celular GPS',
      })
      setPanicMessage('🚨 ALERTA SOS ENVIADA A TELEGRAM Y DASHBOARD — MODO RÁFAGA 3s')
    } catch (err) {
      setPanicMessage('⚠️ Alerta enviada: ' + (err.response?.data?.error || err.message))
    }
  }

  const requestGpsAgain = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsPermissionError(null)
          telemetryClient.forceImmediateLocation()
        },
        (err) => setGpsPermissionError(err.message),
        { enableHighAccuracy: true }
      )
    }
  }

  const coords = telemetry ? [telemetry.latitude, telemetry.longitude] : null

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* ── Top Header ── */}
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xl">
            📱
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Usuario Celular GPS</h1>
            <p className="text-xs text-slate-400">{user.name || user.email}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
        >
          Salir 🚪
        </button>
      </header>

      {/* ── Main Panel ── */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-4">
        {/* Device Status & Quick Switch */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📡</span>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Identificador Activo</span>
              <span className="text-sm font-black text-blue-400 font-mono">{customId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-bold transition"
              title="Ajustes de Servidor e IMEI"
            >
              ⚙️ Ajustes
            </button>

            <button
              onClick={() => setIsTransmitting(!isTransmitting)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 ${
                isTransmitting
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {isTransmitting ? '🟢 ACTIVO' : '⏸️ PAUSADO'}
            </button>
          </div>
        </div>

        {/* Telemetry Parameters & Configuration Box */}
        {showSettings && (
          <form onSubmit={handleSaveSettings} className="bg-slate-900/95 border-2 border-blue-900/40 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-blue-300 uppercase tracking-wide flex items-center gap-1.5">
                ⚙️ Configuración del Servidor y Telemetría
              </span>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                📱 Identificador / IMEI del Celular:
              </label>
              <input
                type="text"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:border-blue-500 outline-none"
                placeholder="Ej: 71690939 o yuri o 949808788"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                🌐 URL del Servidor de Telemetría:
              </label>
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-blue-300 font-mono font-bold focus:border-blue-500 outline-none"
                placeholder="https://einsoft-gp-sbcknd.vercel.app/api/telemetry"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                ⏱️ Frecuencia de Envío (Segundos):
              </label>
              <select
                value={frequencySec}
                onChange={(e) => setFrequencySec(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold focus:border-blue-500 outline-none"
              >
                <option value="5">Cada 5 Segundos (Tiempo Real Máximo)</option>
                <option value="10">Cada 10 Segundos (Recomendado)</option>
                <option value="15">Cada 15 Segundos</option>
                <option value="30">Cada 30 Segundos (Ahorro de Batería)</option>
                <option value="60">Cada 1 Minuto</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="submit"
                className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs shadow-md transition active:scale-95"
              >
                💾 Guardar Ajustes
              </button>

              <button
                type="button"
                onClick={handleTestPing}
                className="py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-black rounded-xl text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1"
              >
                📡 Probar Ping
              </button>
            </div>

            {pingTestStatus && (
              <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-center text-[11px] font-bold text-slate-200 animate-in fade-in">
                {pingTestStatus}
              </div>
            )}
          </form>
        )}

        {/* GPS Permission Warning if applicable */}
        {gpsPermissionError && (
          <div className="bg-amber-950/80 border border-amber-500/50 rounded-2xl p-3.5 text-xs text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <span>⚠️</span> Permiso de Ubicación Requerido
            </div>
            <p className="text-[11px] text-amber-300/80 leading-tight">
              Para que tu celular reporte su posición a la plataforma, debes permitir el acceso al GPS.
            </p>
            <button
              onClick={requestGpsAgain}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow transition"
            >
              📍 Activar Permiso GPS Ahora
            </button>
          </div>
        )}

        {/* Status Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full ${connStatus.badgeClass} flex items-center gap-1.5`}>
              <span className={`w-2 h-2 rounded-full ${connStatus.dotClass}`}></span>
              {connStatus.label}
            </span>
            {offlineCount > 0 ? (
              <span className="text-[10px] bg-amber-900/40 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">
                📦 {offlineCount} en cola offline
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-medium">
                ✓ Sincronizado ({packetsSentTotal} paq.)
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-800/60 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Precisión</span>
              <span className="text-sm font-black text-blue-400">{telemetry?.accuracy != null ? `±${telemetry.accuracy}m` : '--'}</span>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Velocidad</span>
              <span className="text-sm font-black text-emerald-400">{telemetry?.speed != null ? `${telemetry.speed} km/h` : '0 km/h'}</span>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Batería</span>
              <span className="text-sm font-black text-amber-400">{telemetry?.battery != null ? `${telemetry.battery}%` : 'N/A'}</span>
            </div>
          </div>

          {/* Adaptive Frequency Indicator */}
          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Frecuencia adaptativa:</span>
            <span className="font-semibold text-slate-200">
              {panicActive ? '🚨 Ráfaga Pánico (3s)' : (telemetry?.speed || 0) > 5 ? '🚗 En Movimiento (8s)' : '🛑 Detenido (15s)'}
            </span>
          </div>
        </div>

        {/* Map Preview */}
        <div className="h-44 w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 relative shadow-inner">
          {coords ? (
            <MapContainer
              center={coords}
              zoom={16}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              <Marker position={coords} icon={customIcon}>
                <Popup>📍 Mi ubicación actual</Popup>
              </Marker>
              <MapUpdater center={coords} />
            </MapContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs p-4 text-center">
              <span className="animate-spin text-2xl mb-1">🛰️</span>
              Buscando satélites GPS...
              <button
                onClick={requestGpsAgain}
                className="mt-2 text-xs text-blue-400 underline"
              >
                Tocar para forzar lectura GPS
              </button>
            </div>
          )}
        </div>

        {/* SOS Countdown Modal / Overlay */}
        {panicCountdown !== null && (
          <div className="bg-red-950/90 border-2 border-red-500 rounded-2xl p-4 text-center animate-pulse shadow-2xl">
            <p className="text-sm font-black text-red-300 uppercase tracking-wide">
              Transmitiendo Alerta SOS en
            </p>
            <div className="text-5xl font-black text-red-500 my-2">{panicCountdown}s</div>
            <button
              onClick={cancelPanic}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-600 text-sm shadow-md"
            >
              ✋ Cancelar (Fue un error)
            </button>
          </div>
        )}

        {/* Feedback message */}
        {panicMessage && (
          <div className="p-3 bg-red-900/40 border border-red-500/50 rounded-xl text-center text-xs font-bold text-red-200">
            {panicMessage}
          </div>
        )}

        {/* Giant Panic Button */}
        {panicCountdown === null && (
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            <button
              onClick={initiatePanic}
              className="w-48 h-48 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white font-black text-2xl tracking-wider shadow-[0_0_50px_rgba(239,68,68,0.5)] active:scale-95 transition-all flex flex-col items-center justify-center border-4 border-red-400 hover:shadow-[0_0_70px_rgba(239,68,68,0.8)]"
            >
              <span className="text-4xl mb-1">🆘</span>
              <span>PÁNICO</span>
              <span className="text-[10px] tracking-normal font-normal opacity-80 mt-1">Presiona en emergencia</span>
            </button>
          </div>
        )}

        {/* Device & IMEI info footer */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-center text-[11px] text-slate-400 space-y-1">
          <p>📡 <span className="font-semibold">{isNetOnline ? 'Red Móvil Conectada' : '⚠️ Sin Conexión — Guardando Offline'}</span></p>
          <p className="text-[10px] text-slate-500 font-mono">Dispositivo: {customId}</p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="p-3 text-center text-[10px] text-slate-600 border-t border-slate-900">
        EINSoft GPS • Rastreo Personal y Monitoreo de Seguridad
      </footer>
    </div>
  )
}
