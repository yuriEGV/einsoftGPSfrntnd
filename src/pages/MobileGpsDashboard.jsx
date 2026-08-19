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
  const [telemetry, setTelemetry] = useState(null)
  const [lastPacketTime, setLastPacketTime] = useState(null)
  const [offlineCount, setOfflineCount] = useState(0)
  const [isNetOnline, setIsNetOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [packetsSentTotal, setPacketsSentTotal] = useState(0)
  
  // Panic Alert state & countdown
  const [panicCountdown, setPanicCountdown] = useState(null)
  const [panicActive, setPanicActive] = useState(false)
  const [panicMessage, setPanicMessage] = useState('')
  const countdownTimer = useRef(null)

  // Start Telemetry Client on mount
  useEffect(() => {
    telemetryClient.start({
      deviceId: user.imei || user.deviceId || user.id || 'MOBILE-GPS',
      userId: user.id,
      trackerCode: user.personTracker,
    })

    const unsubscribe = telemetryClient.subscribe((event) => {
      if (event.type === 'telemetry_sample') {
        setTelemetry(event.sample)
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
      }
    })

    return () => {
      unsubscribe()
      telemetryClient.stop()
    }
  }, [user.id, user.imei, user.deviceId, user.personTracker])

  // Periodic check of offline count and connection state
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
        latitude: telemetry ? telemetry.latitude : null,
        longitude: telemetry ? telemetry.longitude : null,
        address: 'Ubicación de emergencia celular',
      })
      setPanicMessage('🚨 ALERTA SOS ENVIADA — TRANSMITIENDO RÁFAGA CADA 3s')
    } catch (err) {
      setPanicMessage('⚠️ Error al enviar pánico: ' + (err.response?.data?.error || err.message))
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
              {panicActive ? '🚨 Ráfaga Pánico (3s)' : (telemetry?.speed || 0) > 5 ? '🚗 En Movimiento (8s)' : '🛑 Detenido (30s)'}
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
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
              <span className="animate-spin text-2xl mb-1">⏳</span>
              Esperando coordenadas GPS del celular...
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
          {user.imei && <p className="text-[10px] text-slate-500 font-mono">IMEI / ID: {user.imei}</p>}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="p-3 text-center text-[10px] text-slate-600 border-t border-slate-900">
        EINSoft GPS • Rastreo Personal y Monitoreo de Seguridad
      </footer>
    </div>
  )
}
