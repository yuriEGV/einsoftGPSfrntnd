import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiClient } from '../services/api'

// Helper to center or fit bounds
function MapAutoFitter({ bounds, center }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 })
      } catch (_) {}
    } else if (center) {
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
  const [speedMultiplier, setSpeedMultiplier] = useState(1) // 1x, 2x, 5x, 10x
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 16)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 16))

  const timerRef = useRef(null)

  // Fetch Route History
  const fetchRouteHistory = async () => {
    if (!targetId) return
    setLoading(true)
    setIsPlaying(false)
    try {
      const res = await apiClient.get('/reports/route-history', {
        params: {
          targetType,
          targetId,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        },
      })
      setData(res.data)
      setCurrentIndex(0)
    } catch (err) {
      console.error('Error fetching route history:', err)
      alert('Error cargando historial de ruta: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && targetId) {
      fetchRouteHistory()
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isOpen, targetId])

  // Playback Loop
  useEffect(() => {
    if (isPlaying && data?.waypoints && data.waypoints.length > 1) {
      const intervalMs = Math.max(100, 1000 / speedMultiplier)
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
  const positions = waypoints.map((w) => [w.lat, w.lng])
  const traveledPositions = waypoints.slice(0, currentIndex + 1).map((w) => [w.lat, w.lng])
  const defaultCenter = currentPoint ? [currentPoint.lat, currentPoint.lng] : [-33.0299, -71.6343]

  // Car or Person Animated Marker Icon
  const movingIcon = L.divIcon({
    html: `
      <div class="relative flex flex-col items-center group">
        <div class="px-2 py-0.5 rounded-full bg-indigo-900 text-white font-black text-[10px] shadow-lg whitespace-nowrap mb-1 border border-white">
          ${targetType === 'vehicle' ? '🚗' : '👤'} ${currentPoint ? `${currentPoint.speed} km/h` : ''}
        </div>
        <div class="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-2xl border-2 border-white ring-4 ring-indigo-400/50 animate-pulse">
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
      <div className="bg-white rounded-3xl max-w-5xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-600/30 text-indigo-400 rounded-2xl text-xl">🎞️</span>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                Reproductor de Recorrido Histórico (Playback GPS)
              </h2>
              <p className="text-xs text-slate-400">
                {targetName} • {waypoints.length} puntos de registro satelital
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

        {/* Date Filter & Control Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700">📅 Rango:</span>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-xs shadow-sm"
            />
            <span className="text-slate-400">a</span>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-xs shadow-sm"
            />
            <button
              onClick={fetchRouteHistory}
              disabled={loading}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {loading ? 'Cargando...' : '🔍 Cargar Ruta'}
            </button>
          </div>

          {/* Quick Metrics */}
          {data?.metrics && (
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
              <span>🏃 Vel. Prom: <b className="text-slate-900">{data.metrics.avgSpeed} km/h</b></span>
              <span>⚡ Vel. Máx: <b className="text-purple-600">{data.metrics.maxSpeed} km/h</b></span>
              <span>🛑 Paradas: <b className="text-rose-600">{data.metrics.stopCount}</b></span>
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="flex-1 relative bg-slate-100">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 z-20">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-slate-700">Cargando puntos de recorrido histórico...</p>
            </div>
          ) : waypoints.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center z-10">
              <span className="text-4xl">🗺️</span>
              <p className="text-base font-bold text-slate-800">No se registraron trayectos en este rango de fechas.</p>
              <p className="text-xs text-slate-500">Prueba seleccionando un rango de fechas más amplio arriba.</p>
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
              <MapAutoFitter bounds={positions} />

              {/* Full Planned Trajectory (Gray background) */}
              <Polyline
                positions={positions}
                pathOptions={{ color: '#94a3b8', weight: 4, opacity: 0.5, dashArray: '4, 6' }}
              />

              {/* Traveled Route (Vibrant Purple/Indigo) */}
              <Polyline
                positions={traveledPositions}
                pathOptions={{ color: '#4f46e5', weight: 6, opacity: 0.95 }}
              />

              {/* Start Point Marker */}
              {waypoints[0] && (
                <Marker
                  position={[waypoints[0].lat, waypoints[0].lng]}
                  icon={L.divIcon({
                    html: '<div class="px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[9px] font-bold shadow border border-white whitespace-nowrap">🟢 Inicio</div>',
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
                    html: '<div class="px-2 py-0.5 rounded-full bg-rose-700 text-white text-[9px] font-bold shadow border border-white whitespace-nowrap">🏁 Fin</div>',
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
                    <div className="p-2 text-xs space-y-1">
                      <p className="font-black text-slate-900">{targetName}</p>
                      <p className="text-slate-600">🏃 Velocidad: <b>{currentPoint.speed} km/h</b></p>
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
          <div className="bg-slate-900 text-white p-4 border-t border-slate-800 space-y-3">
            {/* Scrubber Timeline */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-slate-400">
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
                className="flex-1 accent-indigo-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
              />
              <span className="text-[11px] font-mono text-slate-400">
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
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition font-bold text-xs"
                  title="Ir al inicio"
                >
                  ⏮️
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  {isPlaying ? '⏸️ Pausar' : '▶️ Reproducir'}
                </button>
                <button
                  onClick={() => setCurrentIndex(waypoints.length - 1)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition font-bold text-xs"
                  title="Ir al final"
                >
                  ⏭️
                </button>

                {/* Speed Multiplier */}
                <div className="flex items-center bg-slate-800 rounded-xl p-0.5 ml-2 border border-slate-700 text-xs">
                  {[1, 2, 5, 10].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeedMultiplier(s)}
                      className={`px-2 py-1 rounded-lg font-bold transition ${
                        speedMultiplier === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Point Telemetry Dashboard */}
              {currentPoint && (
                <div className="flex items-center gap-4 text-xs">
                  <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                    <span className="text-slate-400">Velocidad: </span>
                    <span className="font-bold text-indigo-400">{currentPoint.speed} km/h</span>
                  </div>
                  {currentPoint.fuel != null && (
                    <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                      <span className="text-slate-400">Combustible: </span>
                      <span className="font-bold text-blue-400">{currentPoint.fuel}%</span>
                    </div>
                  )}
                  {currentPoint.battery != null && (
                    <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                      <span className="text-slate-400">Batería: </span>
                      <span className="font-bold text-purple-400">{currentPoint.battery}%</span>
                    </div>
                  )}
                  <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 hidden sm:block">
                    <span className="text-slate-400">Punto: </span>
                    <span className="font-bold text-white">{currentIndex + 1} / {waypoints.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
