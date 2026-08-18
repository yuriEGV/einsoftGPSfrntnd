import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiClient } from '../services/api'

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
  const [coords, setCoords] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [speed, setSpeed] = useState(null)
  const [batteryLevel, setBatteryLevel] = useState(null)
  const [isBroadcasting, setIsBroadcasting] = useState(true)
  const [lastSync, setLastSync] = useState(null)
  const [syncStatus, setSyncStatus] = useState('Conectando GPS...')
  
  // Panic Alert state & countdown
  const [panicCountdown, setPanicCountdown] = useState(null)
  const [panicActive, setPanicActive] = useState(false)
  const [panicMessage, setPanicMessage] = useState('')
  const countdownTimer = useRef(null)

  // Watch GPS Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setSyncStatus('Geolocalización no soportada en este navegador')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const acc = pos.coords.accuracy
        const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0

        setCoords([lat, lng])
        setAccuracy(Math.round(acc))
        setSpeed(spd)
        setLastSync(new Date())
        setSyncStatus('🟢 GPS Activo y transmitiendo')

        // Send location report to backend
        try {
          await apiClient.post('/people-trackers/report', {
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            speed: spd,
            battery: batteryLevel,
          }).catch(() => {})
        } catch {
          // Silent catch for background updates
        }
      },
      (err) => {
        console.warn('GPS Watch error:', err)
        setSyncStatus(`⚠️ Error GPS: ${err.message}`)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [batteryLevel])

  // Get Battery Level if supported
  useEffect(() => {
    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        setBatteryLevel(Math.round(battery.level * 100))
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100))
        })
      })
    }
  }, [])

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
      // Execute actual panic send
      sendPanicAlert()
      setPanicCountdown(null)
    }
    return () => clearTimeout(countdownTimer.current)
  }, [panicCountdown])

  const cancelPanic = () => {
    clearTimeout(countdownTimer.current)
    setPanicCountdown(null)
    setPanicMessage('Alerta cancelada a tiempo')
    setTimeout(() => setPanicMessage(''), 4000)
  }

  const sendPanicAlert = async () => {
    try {
      setPanicActive(true)
      await apiClient.post('/alerts/panic', {
        latitude: coords ? coords[0] : null,
        longitude: coords ? coords[1] : null,
      })
      setPanicMessage('🚨 ALERTA SOS ENVIADA AL CENTRO DE MONITOREO')
    } catch (err) {
      setPanicMessage('⚠️ Error al enviar pánico: ' + (err.response?.data?.error || err.message))
    }
  }

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
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">{syncStatus}</span>
            {lastSync && (
              <span className="text-[10px] text-slate-500">
                {lastSync.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-800/60 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Precisión</span>
              <span className="text-sm font-black text-blue-400">{accuracy !== null ? `±${accuracy}m` : '--'}</span>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Velocidad</span>
              <span className="text-sm font-black text-emerald-400">{speed !== null ? `${speed} km/h` : '0 km/h'}</span>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Batería</span>
              <span className="text-sm font-black text-amber-400">{batteryLevel !== null ? `${batteryLevel}%` : 'N/A'}</span>
            </div>
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
          <p>📡 <span className="font-semibold">Transmisión en tiempo real activa</span></p>
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
