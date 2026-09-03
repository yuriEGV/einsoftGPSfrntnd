import React, { useState, useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiClient } from '../services/api'
import {
  segmentPointsIntoTrips,
  getMultiSegmentSnappedRoute,
  generateDirectionChevrons,
  calculateBearing,
} from '../services/routingService'

// Helper to center or fit bounds
function MapAutoFitter({ bounds, center }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      try {
        // bounds could be an array of segments [[[lat, lng]...]] or points [[lat, lng]...]
        const flatPoints = Array.isArray(bounds[0]?.[0]) ? bounds.flat() : bounds
        if (flatPoints.length >= 2) {
          map.fitBounds(flatPoints, { padding: [45, 45], maxZoom: 16 })
        }
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
  const [activePreset, setActivePreset] = useState('7d')

  // Trip segmentation state
  const [trips, setTrips] = useState([])
  const [selectedTripId, setSelectedTripId] = useState('all') // 'all' or trip.id
  const [snappedSegments, setSnappedSegments] = useState([]) // Array of [lat, lng][]

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

  // Fetch Route History and Segment into Trips
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
          limit: 2000,
        },
      })
      setData(res.data)
      setCurrentIndex(0)
      setSelectedTripId('all')

      const rawWaypoints = res.data?.waypoints || []

      if (rawWaypoints.length >= 2) {
        // 1. Segmentar puntos en tramos coherentes (rompe saltos temporales o espaciales sobre el mar)
        const computedTrips = segmentPointsIntoTrips(rawWaypoints, {
          maxGapMinutes: 20,
          maxJumpMeters: 3000,
        })
        setTrips(computedTrips)

        // 2. Ajustar cada tramo a calles reales con OSRM (garantiza 0% sobre el mar)
        const snapped = await getMultiSegmentSnappedRoute(computedTrips)
        setSnappedSegments(snapped)
      } else if (rawWaypoints.length === 1) {
        const singleTrip = [{
          id: 1,
          waypoints: rawWaypoints,
          coords: [[rawWaypoints[0].lat, rawWaypoints[0].lng]],
          startCoord: [rawWaypoints[0].lat, rawWaypoints[0].lng],
          endCoord: [rawWaypoints[0].lat, rawWaypoints[0].lng],
          startTime: new Date(rawWaypoints[0].timestamp),
          endTime: new Date(rawWaypoints[0].timestamp),
          durationMinutes: 0,
          distanceKm: '0.0',
          pointCount: 1,
        }]
        setTrips(singleTrip)
        setSnappedSegments([singleTrip[0].coords])
      } else {
        setTrips([])
        setSnappedSegments([])
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

  // Active waypoints (either all or filtered by selected trip)
  const activeWaypoints = useMemo(() => {
    if (!data?.waypoints || data.waypoints.length === 0) return []
    if (selectedTripId === 'all') return data.waypoints
    const t = trips.find((tr) => tr.id === Number(selectedTripId))
    return t ? t.waypoints : data.waypoints
  }, [data, trips, selectedTripId])

  // Active snapped segments to render
  const activeSegments = useMemo(() => {
    if (snappedSegments.length === 0) return []
    if (selectedTripId === 'all') return snappedSegments
    const tripIdx = trips.findIndex((tr) => tr.id === Number(selectedTripId))
    return tripIdx >= 0 && snappedSegments[tripIdx] ? [snappedSegments[tripIdx]] : snappedSegments
  }, [snappedSegments, trips, selectedTripId])

  // Playback Loop
  useEffect(() => {
    if (isPlaying && activeWaypoints.length > 1) {
      const intervalMs = Math.max(50, Math.floor(600 / speedMultiplier))
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= activeWaypoints.length - 1) {
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
  }, [isPlaying, activeWaypoints, speedMultiplier])

  // Generate directional chevrons along snapped roads for all active segments
  const directionChevrons = useMemo(() => {
    const chevrons = []
    activeSegments.forEach((segment) => {
      if (segment && segment.length >= 2) {
        const segChevrons = generateDirectionChevrons(segment, 350)
        chevrons.push(...segChevrons)
      }
    })
    return chevrons
  }, [activeSegments])

  if (!isOpen) return null

  const currentPoint = activeWaypoints[currentIndex] || activeWaypoints[0] || null
  const defaultCenter = currentPoint ? [currentPoint.lat, currentPoint.lng] : [-33.0299, -71.6343]

  // Calculate current bearing for moving marker rotation
  const nextPoint = activeWaypoints[currentIndex + 1] || activeWaypoints[currentIndex] || null
  const currentBearing =
    currentPoint && nextPoint && currentIndex < activeWaypoints.length - 1
      ? calculateBearing([currentPoint.lat, currentPoint.lng], [nextPoint.lat, nextPoint.lng])
      : currentPoint?.heading || 0

  // Traveled positions along the road segments up to the current progress
  const traveledSegments = useMemo(() => {
    if (!currentPoint || activeSegments.length === 0) return []
    const progressRatio = activeWaypoints.length > 1 ? currentIndex / (activeWaypoints.length - 1) : 1

    const result = []
    let totalPointsInAllSegments = 0
    activeSegments.forEach((seg) => {
      totalPointsInAllSegments += seg.length
    })

    const targetPointsCount = Math.max(1, Math.round(totalPointsInAllSegments * progressRatio))
    let pointsAllocated = 0

    for (const seg of activeSegments) {
      if (pointsAllocated >= targetPointsCount) break
      const needed = targetPointsCount - pointsAllocated
      if (needed >= seg.length) {
        result.push(seg)
        pointsAllocated += seg.length
      } else {
        result.push(seg.slice(0, Math.max(2, needed)))
        pointsAllocated += needed
        break
      }
    }

    return result
  }, [currentPoint, activeSegments, currentIndex, activeWaypoints])

  // Animated Marker Icon with Directional Bearing
  const movingIcon = L.divIcon({
    html: `
      <div class="relative flex flex-col items-center group pointer-events-none select-none">
        <div class="px-2.5 py-0.5 rounded-full bg-slate-950/95 text-cyan-300 font-mono font-black text-[11px] shadow-2xl border border-cyan-400/60 whitespace-nowrap mb-1">
          ${targetType === 'vehicle' ? '🚗' : '👤'} ${currentPoint ? `${currentPoint.speed} km/h` : '0 km/h'}
        </div>
        <div class="relative flex items-center justify-center">
          <div class="w-9 h-9 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-black shadow-2xl border-2 border-white ring-4 ring-cyan-400/50">
            ${targetType === 'vehicle' ? '🚗' : '👤'}
          </div>
          <div style="transform: rotate(${currentBearing}deg) translate(0, -18px);" class="absolute transition-transform duration-100">
            <span class="text-cyan-400 text-xs font-black drop-shadow">▲</span>
          </div>
        </div>
      </div>
    `,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })

  // Direction Chevron Leaflet Icon
  const createChevronIcon = (bearing) =>
    L.divIcon({
      html: `
        <div style="transform: rotate(${bearing}deg);" class="w-4 h-4 flex items-center justify-center text-cyan-300 drop-shadow-md select-none pointer-events-none opacity-90">
          <svg viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5">
            <path d="M12 2L2 22l10-4 10 4L12 2z"/>
          </svg>
        </div>
      `,
      className: '',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })

  // Start & End markers for visible trips
  const tripMarkers = (selectedTripId === 'all' ? trips : trips.filter((t) => t.id === Number(selectedTripId)))

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[99999] flex items-center justify-center p-2 md:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-6xl w-full h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-700">
        {/* Modal Header */}
        <div className="px-6 py-3.5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-cyan-950 text-cyan-400 border border-cyan-500/30 rounded-2xl text-xl shadow-lg">
              🎞️
            </span>
            <div>
              <h2 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
                <span>Reproductor de Recorrido Histórico (Playback GPS)</span>
                <span className="px-2.5 py-0.5 text-[11px] font-mono bg-cyan-950 border border-cyan-400/50 text-cyan-300 rounded-full font-bold">
                  {trips.length} {trips.length === 1 ? 'tramo vial' : 'tramos viales'} • {activeWaypoints.length} puntos
                </span>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-full font-semibold">
                  🛡️ Vía Urbana (0% Mar)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {targetName} • Trayectorias reales con dirección de avance y ajuste a calles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-lg transition"
            title="Cerrar reproductor"
          >
            ✕
          </button>
        </div>

        {/* Date Filter & Preset Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Presets */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => applyPreset('today')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  activePreset === 'today' ? 'bg-cyan-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => applyPreset('24h')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  activePreset === '24h' ? 'bg-cyan-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                24h
              </button>
              <button
                onClick={() => applyPreset('7d')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  activePreset === '7d' ? 'bg-cyan-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                7 Días
              </button>
              <button
                onClick={() => applyPreset('30d')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  activePreset === '30d' ? 'bg-cyan-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
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

        {/* Trip / Tramos Selector Bar (if multiple trips exist) */}
        {trips.length > 1 && (
          <div className="bg-slate-950/70 border-b border-slate-800/80 px-6 py-2 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1 shrink-0">
              <span>🛣️</span> Tramos Viales:
            </span>
            <button
              onClick={() => {
                setSelectedTripId('all')
                setCurrentIndex(0)
              }}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold transition shrink-0 border ${
                selectedTripId === 'all'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-md'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              🌐 Todos los Tramos ({trips.length})
            </button>
            {trips.map((t) => {
              const isSel = selectedTripId === String(t.id) || selectedTripId === t.id
              const timeLabel = t.startTime
                ? new Date(t.startTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                : `Tramo ${t.id}`
              const dateLabel = t.startTime
                ? new Date(t.startTime).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
                : ''
              return (
                <button
                  key={`trip-sel-${t.id}`}
                  onClick={() => {
                    setSelectedTripId(t.id)
                    setCurrentIndex(0)
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition shrink-0 border flex items-center gap-1 ${
                    isSel
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span>📍</span>
                  <span>Tramo {t.id}</span>
                  <span className="opacity-75 text-[10px]">
                    ({dateLabel} {timeLabel} • {t.distanceKm} km)
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Map Container */}
        <div className="flex-1 relative bg-slate-950">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur-sm z-20">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-cyan-300 font-mono">
                Calculando rutas satelitales y ajuste a calles...
              </p>
            </div>
          ) : activeWaypoints.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center z-10">
              <span className="text-5xl">🗺️</span>
              <p className="text-base font-bold text-white">No se registraron trayectos en este rango de fechas.</p>
              <p className="text-xs text-slate-400">Prueba presionando los botones <b>7 Días</b> o <b>30 Días</b> arriba.</p>
            </div>
          ) : (
            <MapContainer center={defaultCenter} zoom={14} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapAutoFitter bounds={activeSegments} center={defaultCenter} />

              {/* Full Planned Road Trajectory (Dashed Cyan Backdrop per independent segment) */}
              {activeSegments.map((segment, sIdx) => (
                <Polyline
                  key={`planned-seg-${sIdx}`}
                  positions={segment}
                  pathOptions={{
                    color: '#06b6d4',
                    weight: 5,
                    opacity: 0.35,
                    dashArray: '6, 8',
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              ))}

              {/* Traveled Animated Road Segments (Vibrant Cyan) */}
              {traveledSegments.map((traveledSeg, tIdx) => (
                <Polyline
                  key={`traveled-seg-${tIdx}`}
                  positions={traveledSeg}
                  pathOptions={{
                    color: '#06b6d4',
                    weight: 6,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              ))}

              {/* Direction Chevrons (Flechas de Avance a lo largo de las calles) */}
              {directionChevrons.map((chev, cIdx) => (
                <Marker
                  key={`chev-${cIdx}-${chev.position[0]}-${chev.position[1]}`}
                  position={chev.position}
                  icon={createChevronIcon(chev.bearing)}
                  interactive={false}
                />
              ))}

              {/* Clear Start (🟢 Inicio) & End (🏁 Fin) Markers per Segment */}
              {tripMarkers.map((t) => {
                const startTimeStr = t.startTime
                  ? new Date(t.startTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                  : ''
                const endTimeStr = t.endTime
                  ? new Date(t.endTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                  : ''
                return (
                  <React.Fragment key={`trip-markers-${t.id}`}>
                    {/* Inicio */}
                    {t.startCoord && (
                      <Marker
                        position={t.startCoord}
                        icon={L.divIcon({
                          html: `
                            <div class="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black shadow-xl border border-white whitespace-nowrap flex items-center gap-1">
                              <span>🟢 Inicio</span>
                              ${startTimeStr ? `<span class="opacity-90 font-mono">${startTimeStr}</span>` : ''}
                            </div>
                          `,
                          className: '',
                          iconSize: [0, 0],
                          iconAnchor: [35, 12],
                        })}
                      >
                        <Popup>
                          <div className="p-1 text-xs">
                            <p className="font-bold text-emerald-800">🟢 Punto de Inicio (Tramo {t.id})</p>
                            <p className="text-slate-600">🕒 {t.startTime ? new Date(t.startTime).toLocaleString('es-CL') : 'Inicio'}</p>
                            {t.startAddress && <p className="text-slate-500 text-[10px]">📍 {t.startAddress}</p>}
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* Fin */}
                    {t.endCoord && t.pointCount > 1 && (
                      <Marker
                        position={t.endCoord}
                        icon={L.divIcon({
                          html: `
                            <div class="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black shadow-xl border border-white whitespace-nowrap flex items-center gap-1">
                              <span>🏁 Fin</span>
                              ${endTimeStr ? `<span class="opacity-90 font-mono">${endTimeStr}</span>` : ''}
                            </div>
                          `,
                          className: '',
                          iconSize: [0, 0],
                          iconAnchor: [30, 12],
                        })}
                      >
                        <Popup>
                          <div className="p-1 text-xs">
                            <p className="font-bold text-rose-800">🏁 Punto de Término (Tramo {t.id})</p>
                            <p className="text-slate-600">🕒 {t.endTime ? new Date(t.endTime).toLocaleString('es-CL') : 'Llegada'}</p>
                            <p className="text-slate-600 font-semibold">📏 Distancia: {t.distanceKm} km ({t.durationMinutes} min)</p>
                            {t.endAddress && <p className="text-slate-500 text-[10px]">📍 {t.endAddress}</p>}
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </React.Fragment>
                )
              })}

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
                      <p className="text-slate-700">🧭 Rumbo: <b>{Math.round(currentBearing)}°</b></p>
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
        {activeWaypoints.length > 0 && (
          <div className="bg-slate-950 text-white p-4 border-t border-slate-800 space-y-3">
            {/* Scrubber Timeline */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-cyan-400 min-w-[70px]">
                {currentPoint ? new Date(currentPoint.timestamp).toLocaleTimeString('es-CL') : '--:--'}
              </span>
              <input
                type="range"
                min={0}
                max={activeWaypoints.length - 1}
                value={currentIndex}
                onChange={(e) => {
                  setIsPlaying(false)
                  setCurrentIndex(Number(e.target.value))
                }}
                className="flex-1 accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <span className="text-[11px] font-mono text-slate-400 min-w-[70px] text-right">
                {activeWaypoints[activeWaypoints.length - 1]
                  ? new Date(activeWaypoints[activeWaypoints.length - 1].timestamp).toLocaleTimeString('es-CL')
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
                  disabled={activeWaypoints.length <= 1}
                  className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-lg ${
                    isPlaying
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                  } disabled:opacity-50`}
                >
                  {isPlaying ? '⏸️ Pausar' : '▶️ Reproducir'}
                </button>
                <button
                  onClick={() => setCurrentIndex(activeWaypoints.length - 1)}
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
                        speedMultiplier === spd ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Scrubber Telemetry */}
              <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
                <span>
                  Velocidad: <b className="text-cyan-400">{currentPoint?.speed ?? 0} km/h</b>
                </span>
                <span>
                  Rumbo: <b className="text-emerald-400">{Math.round(currentBearing)}°</b>
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
                  Punto: <b className="text-white">{currentIndex + 1}</b>/{activeWaypoints.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
