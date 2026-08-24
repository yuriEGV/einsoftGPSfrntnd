import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiClient } from '../services/api'
import { getDeviceConnectionStatus } from '../utils/deviceState'

// FlyTo Map Updater
function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 16, { duration: 1 })
    }
  }, [center, map])
  return null
}

const tacticalIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-10 h-10 rounded-full bg-cyan-500/30 animate-ping"></div>
      <div class="w-8 h-8 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center text-white text-xs font-black shadow-[0_0_15px_rgba(6,182,212,0.6)]">
        🛰️
      </div>
    </div>
  `,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -20],
})

export default function MobileGpsDashboard() {
  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}')
  
  // Custom ID selection
  const [customId, setCustomId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const paramId = params.get('id') || params.get('imei') || params.get('user');
      if (paramId) {
        localStorage.setItem('einsoft_mobile_id', paramId);
        return paramId;
      }
    } catch (_) {}
    return localStorage.getItem('einsoft_mobile_id') || user.imei || user.deviceId || user.phone || 'MOVIL-3550';
  })

  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('einsoft_telemetry_url') || 'https://einsoft-gp-sbcknd.vercel.app/api/telemetry')
  const [isTransmitting, setIsTransmitting] = useState(true)
  const [sentinelActive, setSentinelActive] = useState(false)
  const [activeTab, setActiveTab] = useState('sensors') // 'sensors', 'map', 'events'
  const [showSettings, setShowSettings] = useState(false)

  // Telemetry & Motion State
  const [telemetry, setTelemetry] = useState(null)
  const [motion, setMotion] = useState({
    ax: 0, ay: 0, az: 0,
    gx: 0, gy: 0, gz: 0,
    gForce: 1.0,
    peakGForce: 1.0,
    roll: 0,
    pitch: 0,
  })
  const [driverScore, setDriverScore] = useState(98)
  const [eventLog, setEventLog] = useState([
    { id: '1', type: 'INIT', message: 'EYE-NODE 360 inicializado con éxito.', severity: 'info', timestamp: new Date().toISOString() }
  ])
  const [blackboxCount, setBlackboxCount] = useState(0)
  const [packetsSentTotal, setPacketsSentTotal] = useState(0)
  const [lastPacketTime, setLastPacketTime] = useState(null)
  const [isNetOnline, setIsNetOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [panicCountdown, setPanicCountdown] = useState(null)
  const [panicActive, setPanicActive] = useState(false)
  const countdownTimer = useRef(null)
  const transmissionTimer = useRef(null)

  // Presets
  const PRESET_PEOPLE = [
    { label: 'manuel', id: 'MOVIL-3550' },
    { label: 'yuri', id: 'PER-139F17' },
    { label: 'gloria', id: 'PER-FC9B50' },
    { label: 'sarem', id: '350673971668546' },
    { label: 'veronica', id: 'PER-5CA27E' },
  ]

  // Start Device Motion & Orientation Listeners
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleMotion = (e) => {
      const acc = e.accelerationIncludingGravity || e.acceleration || {}
      const ax = acc.x || 0
      const ay = acc.y || 0
      const az = acc.z || 0
      const gCalc = Math.sqrt(ax * ax + ay * ay + az * az) / 9.81
      const gForce = isNaN(gCalc) || gCalc < 0.05 ? 1.0 : Number(gCalc.toFixed(2))

      setMotion(prev => ({
        ax: Number(ax.toFixed(2)),
        ay: Number(ay.toFixed(2)),
        az: Number(az.toFixed(2)),
        gx: Number(((e.rotationRate?.alpha) || 0).toFixed(1)),
        gy: Number(((e.rotationRate?.beta) || 0).toFixed(1)),
        gz: Number(((e.rotationRate?.gamma) || 0).toFixed(1)),
        gForce,
        peakGForce: Math.max(prev.peakGForce, gForce),
        roll: prev.roll,
        pitch: prev.pitch,
      }))
    }

    const handleOrientation = (e) => {
      setMotion(prev => ({
        ...prev,
        roll: Number((e.gamma || 0).toFixed(1)),
        pitch: Number((e.beta || 0).toFixed(1)),
      }))
    }

    if (window.DeviceMotionEvent) window.addEventListener('devicemotion', handleMotion, { passive: true })
    if (window.DeviceOrientationEvent) window.addEventListener('deviceorientation', handleOrientation, { passive: true })

    return () => {
      if (window.DeviceMotionEvent) window.removeEventListener('devicemotion', handleMotion)
      if (window.DeviceOrientationEvent) window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])

  // Geolocation & Transmission Loop
  useEffect(() => {
    if (!isTransmitting) return

    let watchId = null
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy, altitude, speed, heading } = pos.coords
          const speedKmh = speed != null && !isNaN(speed) ? Math.round(speed * 3.6) : 0
          setTelemetry({
            latitude,
            longitude,
            accuracy: Math.round(accuracy || 0),
            altitude: Math.round(altitude || 0),
            speed: speedKmh,
            heading: Math.round(heading || 0),
            timestamp: pos.timestamp || Date.now(),
          })
        },
        (err) => console.log('[GNSS] Watch error:', err.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      )
    }

    const sendTelemetryTick = async () => {
      if (!isTransmitting) return

      let lat = telemetry?.latitude
      let lng = telemetry?.longitude

      if (!lat || !lng) {
        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition((p) => {
            lat = p.coords.latitude
            lng = p.coords.longitude
          }, () => {})
        }
      }

      if (lat && lng) {
        const payload = {
          deviceId: customId,
          trackerCode: customId,
          latitude: lat,
          longitude: lng,
          accuracy: telemetry?.accuracy || 10,
          altitude: telemetry?.altitude || 0,
          speed: telemetry?.speed || 0,
          heading: telemetry?.heading || 0,
          battery: 100,
          isPanic: panicActive,
          sentinelActive,
          driverScore,
          imu: {
            ax: motion.ax,
            ay: motion.ay,
            az: motion.az,
            gx: motion.gx,
            gy: motion.gy,
            gz: motion.gz,
            gForce: motion.gForce,
            peakGForce: motion.peakGForce,
            roll: motion.roll,
            pitch: motion.pitch,
            eventType: panicActive ? 'PANIC_SOS' : motion.gForce > 2.8 ? 'CRASH_IMPACT' : 'NORMAL',
          },
          timestamp: new Date().toISOString(),
        }

        try {
          const res = await fetch(`${serverUrl.replace(/\/$/, '')}/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (res.ok) {
            setLastPacketTime(new Date())
            setPacketsSentTotal(c => c + 1)
          }
        } catch (_) {
          setBlackboxCount(c => c + 1)
        }
      }

      const delay = panicActive ? 3000 : sentinelActive ? 15000 : 8000
      transmissionTimer.current = setTimeout(sendTelemetryTick, delay)
    }

    transmissionTimer.current = setTimeout(sendTelemetryTick, 2000)

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined') navigator.geolocation.clearWatch(watchId)
      if (transmissionTimer.current) clearTimeout(transmissionTimer.current)
    }
  }, [isTransmitting, customId, serverUrl, panicActive, sentinelActive, telemetry?.latitude, telemetry?.longitude, motion.gForce, driverScore])

  // Panic Handlers
  const initiatePanic = () => {
    if (window.navigator?.vibrate) {
      window.navigator.vibrate([200, 100, 200, 100, 400])
    }
    setPanicCountdown(4)
  }

  useEffect(() => {
    if (panicCountdown === null) return
    if (panicCountdown > 0) {
      countdownTimer.current = setTimeout(() => {
        setPanicCountdown(panicCountdown - 1)
      }, 1000)
    } else if (panicCountdown === 0) {
      setPanicActive(true)
      setPanicCountdown(null)
      // Send alert
      apiClient.post('/alerts/panic', {
        deviceId: customId,
        latitude: telemetry?.latitude,
        longitude: telemetry?.longitude,
        address: 'Alerta SOS desde EYE-NODE 360',
      }).catch(() => {})
    }
    return () => clearTimeout(countdownTimer.current)
  }, [panicCountdown, customId, telemetry])

  const mapCenter = telemetry?.latitude && telemetry?.longitude ? [telemetry.latitude, telemetry.longitude] : [-33.045, -71.615]

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 font-sans flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* ── Top Tactical HUD Header ── */}
      <header className="bg-slate-950/90 border-b border-cyan-950/80 px-4 py-3 sticky top-0 z-40 backdrop-blur-md flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-900 border border-cyan-400/40 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black tracking-wider text-white">EYE-NODE</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-cyan-950 border border-cyan-500/50 text-cyan-300 rounded font-bold">
                TRACKER 360
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span>ID:</span>
              <span className="text-cyan-400 font-bold">{customId}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            sentinelActive
              ? 'bg-amber-950/70 border-amber-500/50 text-amber-300 animate-pulse'
              : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
          }`}>
            {sentinelActive ? '🛡️ CENTINELA' : '🛰️ ACTIVO 360'}
          </span>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* ── Main Tactical Content ── */}
      <main className="p-4 flex-1 flex flex-col gap-4 max-w-lg mx-auto w-full">
        {/* Profile Selector */}
        <div className="bg-slate-950/80 border border-cyan-950 rounded-2xl p-3 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span>👤</span> Asignar Activo / Perfil:
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">{customId}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESET_PEOPLE.map((p) => {
              const isSelected = customId === p.id || customId === p.label;
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    setCustomId(p.id)
                    localStorage.setItem('einsoft_mobile_id', p.id)
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition capitalize flex items-center gap-1 border ${
                    isSelected
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)] scale-105'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  {isSelected ? '✓ ' : ''}👤 {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado del Nodo</span>
            <div className="flex items-center justify-between pt-2">
              <span className={`text-xs font-black flex items-center gap-1.5 ${isTransmitting ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span className={`w-2 h-2 rounded-full ${isTransmitting ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
                {isTransmitting ? 'EN LÍNEA' : 'PAUSADO'}
              </span>
              <button
                onClick={() => setIsTransmitting(!isTransmitting)}
                className="px-3 py-1.5 rounded-xl font-black text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition"
              >
                {isTransmitting ? '⏹️ Pausar' : '▶️ Iniciar'}
              </button>
            </div>
          </div>

          <div className={`border rounded-2xl p-3 shadow-xl flex flex-col justify-between transition-all ${
            sentinelActive
              ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
              : 'bg-slate-950/80 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">🛡️ Centinela</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${sentinelActive ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>
                {sentinelActive ? 'ARMADO' : 'DESARMADO'}
              </span>
            </div>
            <div className="pt-2 flex items-center justify-between">
              <p className="text-[10px] text-slate-400 leading-tight">Anti-Manipulación</p>
              <button
                onClick={() => setSentinelActive(!sentinelActive)}
                className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-all shadow-md active:scale-95 ${
                  sentinelActive
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {sentinelActive ? '✓ Armado' : 'Armar'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setActiveTab('sensors')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'sensors' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🧭</span> Sensores 360
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'map' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🗺️</span> Mapa Táctico
          </button>
        </div>

        {/* Tab 1: Sensors */}
        {activeTab === 'sensors' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Driver Score & G-Force */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-900/40 rounded-2xl p-4 shadow-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  🧠 AI Comportamiento del Conductor
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-400">
                    {driverScore}<span className="text-sm font-bold text-slate-500">/100</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-950/60 border-emerald-500/40 text-emerald-300">
                    ✓ Excelente
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono pt-1">
                  <span>✓ Velocidad y frenado controlados</span>
                </div>
              </div>

              <div className="text-right border-l border-slate-800 pl-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fuerza G</span>
                <span className={`text-2xl font-black font-mono ${
                  motion.gForce > 2.0 ? 'text-red-400 animate-pulse' : motion.gForce > 1.3 ? 'text-amber-400' : 'text-cyan-400'
                }`}>
                  {motion.gForce.toFixed(2)}G
                </span>
                <span className="text-[9px] text-slate-500 font-mono block">Pico: {motion.peakGForce.toFixed(2)}G</span>
              </div>
            </div>

            {/* 6 Sensors Grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 shadow">
                <span className="text-lg block">🛰️</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">GNSS 4-Band</span>
                <span className="font-extrabold text-cyan-400 text-xs mt-0.5 block">
                  {telemetry?.accuracy ? `±${telemetry.accuracy}m` : 'Fijando...'}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">RTK Multi-Band</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 shadow">
                <span className="text-lg block">🏃</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Velocidad</span>
                <span className="font-extrabold text-white text-base mt-0.5 block font-mono">
                  {telemetry?.speed || 0}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">km/h</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 shadow">
                <span className="text-lg block">📐</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Inclinación</span>
                <span className="font-extrabold text-indigo-300 text-xs mt-0.5 block font-mono">
                  {motion.roll}° / {motion.pitch}°
                </span>
                <span className="text-[9px] text-slate-500 font-mono">Roll / Pitch</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 shadow">
                <span className="text-lg block">🔋</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Energía</span>
                <span className="font-extrabold text-emerald-400 text-xs mt-0.5 block font-mono">
                  100%
                </span>
                <span className="text-[9px] text-slate-500 font-mono">En Línea</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 shadow">
                <span className="text-lg block">📦</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Caja Negra</span>
                <span className="font-extrabold text-xs mt-0.5 block font-mono">
                  {blackboxCount} pts
                </span>
                <span className="text-[9px] text-slate-500 font-mono">En Memoria</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 shadow">
                <span className="text-lg block">📶</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Enlace IoT</span>
                <span className="font-extrabold text-xs mt-0.5 block text-emerald-400">
                  Conectado
                </span>
                <span className="text-[9px] text-slate-500 font-mono">{packetsSentTotal} envíos</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">
                📍 {telemetry?.latitude ? `${telemetry.latitude.toFixed(5)}, ${telemetry.longitude.toFixed(5)}` : 'Buscando satélites GNSS...'}
              </span>
              <span className="text-cyan-400 font-bold">
                Alt: {telemetry?.altitude || 0}m | Rumbo: {telemetry?.heading || 0}°
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Map */}
        {activeTab === 'map' && (
          <div className="h-64 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative animate-in fade-in duration-200">
            <MapContainer
              center={mapCenter}
              zoom={15}
              className="h-full w-full"
            >
              <MapUpdater center={mapCenter} />
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={mapCenter} icon={tacticalIcon}>
                <Popup>
                  <div className="p-1 text-xs">
                    <p className="font-bold text-slate-900">🛰️ {customId}</p>
                    <p className="text-slate-600">Vel: {telemetry?.speed || 0} km/h</p>
                    <p className="text-slate-600 font-mono text-[10px]">G-Force: {motion.gForce}G</p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        {/* Panic Button */}
        {panicCountdown !== null && (
          <div className="p-4 bg-red-600 rounded-2xl text-center space-y-2 animate-bounce shadow-2xl">
            <p className="text-sm font-black uppercase tracking-wider">
              🚨 TRANSMITIENDO PÁNICO EN {panicCountdown}s...
            </p>
            <button
              onClick={() => setPanicCountdown(null)}
              className="px-4 py-1.5 bg-black text-white rounded-xl text-xs font-bold"
            >
              Cancelar
            </button>
          </div>
        )}

        {panicActive && (
          <div className="p-4 bg-gradient-to-r from-red-600 to-rose-700 border-2 border-white rounded-2xl flex items-center justify-between text-white shadow-2xl animate-pulse">
            <div>
              <p className="font-black text-xs uppercase tracking-wide">🚨 MODO PÁNICO SOS ACTIVO</p>
              <p className="text-[10px] text-red-100">Transmitiendo ráfagas continuas de auxilio.</p>
            </div>
            <button
              onClick={() => setPanicActive(false)}
              className="px-3 py-1.5 bg-black hover:bg-slate-900 text-red-300 font-bold rounded-xl text-xs"
            >
              ✓ Finalizar
            </button>
          </div>
        )}

        {panicCountdown === null && !panicActive && (
          <div className="flex justify-center py-2">
            <button
              onClick={initiatePanic}
              className="w-36 h-36 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-800 text-white font-black text-lg tracking-wider shadow-[0_0_40px_rgba(239,68,68,0.5)] active:scale-95 transition-all flex flex-col items-center justify-center border-4 border-red-400 hover:shadow-[0_0_60px_rgba(239,68,68,0.8)]"
            >
              <span className="text-3xl mb-0.5">🆘</span>
              <span>PÁNICO</span>
              <span className="text-[9px] font-normal opacity-80">Presiona en emergencia</span>
            </button>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-950 border border-cyan-950 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                ⚙️ Configuración EYE-NODE 360
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">
                  Identificador del Dispositivo
                </label>
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold text-cyan-300"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">
                  URL Servidor de Telemetría
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <button
                onClick={() => {
                  localStorage.setItem('einsoft_mobile_id', customId)
                  localStorage.setItem('einsoft_telemetry_url', serverUrl)
                  setShowSettings(false)
                }}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl shadow-lg mt-2"
              >
                💾 Guardar Ajustes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="p-3 text-center text-[10px] text-slate-600 border-t border-slate-950 font-mono">
        EYE-NODE 360 • Plataforma de Telemetría Táctica e Inteligencia Móvil
      </footer>
    </div>
  )
}
