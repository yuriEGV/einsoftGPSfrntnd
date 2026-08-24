import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiClient } from '../services/api'
import { getRoadSnappedRoute } from '../services/routingService'

// Helper to center or fit bounds
function MapAutoFitter({ bounds, center }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 })
      } catch (_) {}
    } else if (center && center[0] && center[1]) {
      map.flyTo(center, 15)
    }
  }, [bounds, center, map])
  return null
}

export default function RoutePlaybackModal({
  isOpen,
  onClose,
  targetType = 'vehicle',
  targetId,
  targetName = 'Vehículo',
}) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(2) // 1x, 2x, 5x, 10x
  const [snappedRoute, setSnappedRoute] = useState([])
  const [activePreset, setActivePreset] = useState('7d')

  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 16)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 16))

  const timerRef = useRef(null)

  // Presets Handlers
  const applyPreset = (presetKey) => {
    setActivePreset(presetKey)
    const now = new Date()
    let start = new Date()

    if (presetKey === 'today') {
      start.setHours(0, 0, 0, 0)
    } else if (presetKey === '24h') {
      start.setDate(now.getDate() - 1)
    } else if (presetKey === '7d') {
      start.setDate(now.getDate() - 7)
    } else if (presetKey === '30d') {
      start.setDate(now.getDate() - 30)
    }

    const startStr = start.toISOString().slice(0, 16)
    const endStr = now.toISOString().slice(0, 16)
    setStartDate(startStr)
    setEndDate(endStr)

    fetchRouteHistory(startStr, endStr)
  }

  // Fetch Route History
  const fetchRouteHistory = async (customStart, customEnd) => {
    if (!targetId) return
    setLoading(true)
    setIsPlaying(false)
    try {
      const sDate = customStart || startDate
      const eDate = customEnd || endDate

      const res = await apiClient.get('/reports/route-history', {
        params: {
          targetType,
          targetId,
          startDate: new Date(sDate).toISOString(),
          endDate: new Date(eDate).toISOString(),
          limit: 1000,
        },
      })
      setData(res.data)
      setCurrentIndex(0)

      const wps = res.data?.waypoints || []
      if (wps.length >= 2) {
        const rawPts = wps.map((w) => [w.lat, w.lng])
        getRoadSnappedRoute(rawPts)
          .then((snapped) => {
            if (snapped && snapped.length > 2) {
              setSnappedRoute(snapped)
            } else {
              setSnappedRoute(rawPts)
            }
          })
          .catch(() => setSnappedRoute(rawPts))
      } else {
        setSnappedRoute(wps.map((w) => [w.lat, w.lng]))
      }
    } catch (err) {
      console.error('Error fetching route history:', err)
      alert('Error cargando historial de ruta: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && targetId) {
      applyPreset('7d')
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isOpen, targetId])

  // Playback Loop
  useEffect(() => {
    if (isPlaying && data?.waypoints && data.waypoints.length > 1) {
      const intervalMs = Math.max(60, Math.floor(600 / speedMultiplier))
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= data.waypoints.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, intervalMs)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, data, speedMultiplier])

  if (!isOpen) return null

  const waypoints = data?.waypoints || []
  const currentPoint = waypoints[currentIndex] || waypoints[0] || null
  const positions = snappedRoute.length > 0 ? snappedRoute : waypoints.map((w) => [w.lat, w.lng])
  
  // Calculate traveled slice
  const traveledPositions = waypoints.slice(0, currentIndex + 1).map((w) => [w.lat, w.lng])
  const defaultCenter = currentPoint ? [currentPoint.lat, currentPoint.lng] : [-33.0299, -71.6343]

  // Animated Marker Icon
  const movingIcon = L.divIcon({
    html: `
      <div class="relative flex flex-col items-center group">
        <div class="px-2 py-0.5 rounded-full bg-slate-950 text-cyan-300 font-mono font-bold text-[10px] shadow-2xl border border-cyan-500/50 whitespace-nowrap mb-1">
          ${targetType === 'vehicle' ? '🚗' : '👤'} ${currentPoint ? `${currentPoint.speed} km/h` : ''}
        </div>
        <div class="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-black shadow-2xl border-2 border-white ring-4 ring-cyan-400/50 animate-pulse">
          ${targetType === 'vehicle' ? '🚗' : '📍'}
        </div>
      </div>
    `,
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 16],
  })

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[99999] flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-5xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-700">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-cyan-950 text-cyan-400 border border-cyan-500/30 rounded-2xl text-xl shadow-lg">
              🎞️
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Reproductor de Recorrido Histórico (Playback GPS)</span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-900/60 border border-cyan-400/40 text-cyan-300 rounded-full">
                  {waypoints.length} puntos
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {targetName} • {waypoints.length > 1 ? 'Viajes y trayectorias reales registradas' : 'Posición satelital'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Date Filter & Preset Bar */}
        <div className="bg-slate-950/80 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Presets */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => applyPreset('today')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  activePreset === 'today' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => applyPreset('24h')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  activePreset === '24h' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                24h
              </button>
              <button
                onClick={() => applyPreset('7d')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  activePreset === '7d' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                7 Días
              </button>
              <button
                onClick={() => applyPreset('30d')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  activePreset === '30d' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                30 Días
              </button>
            </div>

            {/* Custom Range Inputs */}
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => {
                setActivePreset('custom')
                setStartDate(e.target.value)
              }}
              className="px-2.5 py-1 rounded-xl border border-slate-700 bg-slate-900 font-medium text-slate-200 text-xs shadow-inner"
            />
            <span className="text-slate-500">a</span>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => {
                setActivePreset('custom')
                setEndDate(e.target.value)
              }}
              className="px-2.5 py-1 rounded-xl border border-slate-700 bg-slate-900 font-medium text-slate-200 text-xs shadow-inner"
            />
            <button
              onClick={() => fetchRouteHistory()}
              disabled={loading}
              className="px-3.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl transition shadow-lg shadow-cyan-900/30 disabled:opacity-50"
            >
              {loading ? 'Cargando...' : '🔍 Filtrar'}
            </button>
          </div>

          {/* Quick Metrics */}
          {data?.metrics && (
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 shadow">
              <span>🏃 Vel. Prom: <b className="text-white">{data.metrics.avgSpeed} km/h</b></span>
              <span>⚡ Vel. Máx: <b className="text-cyan-400">{data.metrics.maxSpeed} km/h</b></span>
              <span>🛑 Paradas: <b className="text-rose-400">{data.metrics.stopCount}</b></span>
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="flex-1 relative bg-slate-950">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur-sm z-20">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-cyan-300 font-mono">Cargando telemetría satelital histórica...</p>
            </div>
          ) : waypoints.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center z-10">
              <span className="text-5xl">🗺️</span>
              <p className="text-base font-bold text-white">No se registraron trayectos en este rango de fechas.</p>
              <p className="text-xs text-slate-400">Prueba presionando los botones <b>7 Días</b> o <b>30 Días</b> arriba.</p>
            </div>
          ) : (
            <MapContainer
              center={defaultCenter}
              zoom={14}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapAutoFitter bounds={positions} center={defaultCenter} />

              {/* Full Planned Trajectory (Gray background) */}
              <Polyline
                positions={positions}
                pathOptions={{ color: '#06b6d4', weight: 4, opacity: 0.35, dashArray: '4, 6' }}
              />

              {/* Traveled Route (Vibrant Cyan) */}
              <Polyline
                positions={traveledPositions}
                pathOptions={{ color: '#06b6d4', weight: 6, opacity: 0.95 }}
              />

              {/* Start Point Marker */}
              {waypoints[0] && (
                <Marker
                  position={[waypoints[0].lat, waypoints[0].lng]}
                  icon={L.divIcon({
                    html: '<div class="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold shadow-lg border border-white whitespace-nowrap">🟢 Inicio</div>',
                    className: '',
                    iconSize: [0, 0],
                    iconAnchor: [20, 10],
                  })}
                />
              )}

              {/* End Point Marker */}
              {waypoints.length > 1 && (
                <Marker
                  position={[waypoints[waypoints.length - 1].lat, waypoints[waypoints.length - 1].lng]}
                  icon={L.divIcon({
                    html: '<div class="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold shadow-lg border border-white whitespace-nowrap">🏁 Fin</div>',
                    className: '',
                    iconSize: [0, 0],
                    iconAnchor: [15, 10],
                  })}
                />
              )}

              {/* Current Moving Marker */}
              {currentPoint && (
                <Marker
                  position={[currentPoint.lat, currentPoint.lng]}
                  icon={movingIcon}
                  zIndexOffset={10000}
                >
                  <Popup>
                    <div className="p-2 text-xs space-y-1 text-slate-900">
                      <p className="font-black text-sm text-cyan-900">{targetName}</p>
                      <p className="text-slate-700">🏃 Velocidad: <b>{currentPoint.speed} km/h</b></p>
                      {currentPoint.fuel != null && <p className="text-blue-600">⛽ Combustible: <b>{currentPoint.fuel}%</b></p>}
                      {currentPoint.battery != null && <p className="text-purple-600">🔋 Batería: <b>{currentPoint.battery}%</b></p>}
                      <p className="text-slate-500 font-mono text-[10px]">
                        🕒 {new Date(currentPoint.timestamp).toLocaleString('es-CL')}
                      </p>
                      {currentPoint.address && <p className="text-slate-700 text-[10px]">📍 {currentPoint.address}</p>}
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          )}
        </div>

        {/* Playback Multimedia Controller */}
        {waypoints.length > 0 && (
          <div className="bg-slate-950 text-white p-4 border-t border-slate-800 space-y-3">
            {/* Scrubber Timeline */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-cyan-400 min-w-[70px]">
                {currentPoint ? new Date(currentPoint.timestamp).toLocaleTimeString('es-CL') : '--:--'}
              </span>
              <input
                type="range"
                min={0}
                max={waypoints.length - 1}
                value={currentIndex}
                onChange={(e) => {
                  setIsPlaying(false)
                  setCurrentIndex(Number(e.target.value))
                }}
                className="flex-1 accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <span className="text-[11px] font-mono text-slate-400 min-w-[70px] text-right">
                {waypoints[waypoints.length - 1]
                  ? new Date(waypoints[waypoints.length - 1].timestamp).toLocaleTimeString('es-CL')
                  : '--:--'}
              </span>
            </div>

            {/* Playback Controls & Real-Time Stats */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Media Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentIndex(0)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition"
                  title="Reiniciar"
                >
                  ⏮️
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={waypoints.length <= 1}
                  className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-lg ${
                    isPlaying
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                  } disabled:opacity-50`}
                >
                  {isPlaying ? '⏸️ Pausar' : '▶️ Reproducir'}
                </button>
                <button
                  onClick={() => setCurrentIndex(waypoints.length - 1)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition"
                  title="Ir al final"
                >
                  ⏭️
                </button>

                {/* Speed Multiplier */}
                <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800 ml-2">
                  {[1, 2, 5, 10].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setSpeedMultiplier(spd)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                        speedMultiplier === spd ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Scrubber Telemetry */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <span>
                  Velocidad: <b className="text-cyan-400">{currentPoint?.speed ?? 0} km/h</b>
                </span>
                {currentPoint?.fuel != null && (
                  <span>
                    Combustible: <b className="text-blue-400">{currentPoint.fuel}%</b>
                  </span>
                )}
                {currentPoint?.battery != null && (
                  <span>
                    Batería: <b className="text-purple-400">{currentPoint.battery}%</b>
                  </span>
                )}
                <span className="text-slate-400">
                  Punto: <b className="text-white">{currentIndex + 1}</b>/{waypoints.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
