import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { getPersonColor } from '../pages/PeopleTracker'
import { getDeviceConnectionStatus } from '../utils/deviceState'
import { generateDirectionChevrons, getDistanceMeters } from '../services/routingService'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// ─── Custom Vehicle Marker Icon ──────────────────────────────────────────────
function makeVehicleIcon(color, selected = false, isAlert = false) {
  if (isAlert) {
    const svg = encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50">
        <circle cx="20" cy="20" r="18" fill="#ef4444" opacity="0.4">
          <animate attributeName="r" values="14;20;14" dur="1s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1s" repeatCount="indefinite"/>
        </circle>
        <path d="M20 2C11.2 2 4 9.2 4 18c0 12 16 30 16 30s16-18 16-30c0-8.8-7.2-16-16-16z" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
        <circle cx="20" cy="18" r="8" fill="#ffffff"/>
        <text x="20" y="23" font-size="14" font-family="Arial" font-weight="900" fill="#dc2626" text-anchor="middle">!</text>
      </svg>
    `)
    return L.icon({
      iconUrl: `data:image/svg+xml,${svg}`,
      iconSize: [44, 55],
      iconAnchor: [22, 55],
      popupAnchor: [0, -50],
    })
  }

  const size = selected ? 38 : 30
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="white" fill-opacity="0.9"/>
    </svg>
  `)
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [size, size * 1.5],
    iconAnchor: [size / 2, size * 1.5],
    popupAnchor: [0, -size],
  })
}

// ─── Custom Person Marker Icon ───────────────────────────────────────────────
function makePersonDivIcon(person, isSelected, isPanic, isOffline, index = 0) {
  const name = person.name || 'Persona'
  const battery = person.batteryLevel != null ? `${person.batteryLevel}%` : ''
  const colorObj = getPersonColor(name, index)
  const bgColor = isPanic ? '#dc2626' : isSelected ? '#7c3aed' : isOffline ? '#475569' : colorObj.bg
  const borderRing = isSelected ? 'ring-4 ring-purple-400 ring-offset-2 scale-110 shadow-2xl z-50' : 'shadow-lg'

  const html = `
    <div class="relative flex flex-col items-center group cursor-pointer transition-all duration-300 ${borderRing}" style="transform: translate(-50%, -100%);">
      <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[11px] font-black shadow-md whitespace-nowrap mb-1" style="background-color: ${bgColor};">
        ${isPanic ? '<span class="animate-ping w-2 h-2 rounded-full bg-white"></span>' : !isOffline ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>' : ''}
        <span>👤 ${name}</span>
        ${battery ? `<span class="opacity-90 font-mono text-[9px] bg-black/20 px-1 rounded">🔋${battery}</span>` : ''}
      </div>

      <div class="relative flex items-center justify-center">
        ${!isOffline && !isPanic ? `<div class="absolute w-8 h-8 rounded-full animate-ping" style="background-color: ${colorObj.fill}40;"></div>` : ''}
        ${isPanic ? '<div class="absolute w-10 h-10 rounded-full bg-red-500/50 animate-ping"></div>' : ''}
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow" style="background-color: ${bgColor};">
          ${isPanic ? '🚨' : isSelected ? '📍' : '👤'}
        </div>
      </div>
      <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px]" style="border-t-color: ${bgColor};"></div>
    </div>
  `

  return L.divIcon({
    html,
    className: 'custom-person-marker-container',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -45],
  })
}

const STATUS_COLORS = {
  active: '#10b981',
  alert: '#ef4444',
  offline: '#6b7280',
  inactive: '#9ca3af',
}

// ─── ChangeView Helper ────────────────────────────────────────────────────────
function ChangeView({ center, zoom }) {
  const map = useMap()
  const prevCenter = useRef(null)

  useEffect(() => {
    if (!center || (center[0] === 0 && center[1] === 0)) return
    const changed = !prevCenter.current ||
      Math.abs(prevCenter.current[0] - center[0]) > 0.0001 ||
      Math.abs(prevCenter.current[1] - center[1]) > 0.0001
    if (changed) {
      map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.5 })
      prevCenter.current = center
    }
  }, [center, zoom, map])

  return null
}

function isValidCoords(coords) {
  if (!coords || !Array.isArray(coords) || coords.length < 2) return false
  const [lng, lat] = coords
  if (typeof lng !== 'number' || typeof lat !== 'number') return false
  if (isNaN(lng) || isNaN(lat)) return false
  if (lng === 0 && lat === 0) return false
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
  return true
}

function formatAge(lastUpdate) {
  if (!lastUpdate) return 'Sin datos'
  const mins = Math.round((Date.now() - new Date(lastUpdate)) / 60000)
  if (mins < 1) return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs} h`
  return `Hace ${Math.floor(hrs / 24)} días`
}

export default function MapComponent({
  vehicles = [],
  people = [],
  selectedVehicle = null,
  selectedPerson = null,
  onVehicleSelect,
  onPersonSelect,
  realTimeData = {},
  assetTypeFilter = 'all',
}) {
  const mapContainerRef = useRef(null)
  const defaultCenter = [-33.0458, -71.6197] // Valparaíso, Chile
  const defaultZoom = 13

  const [trails, setTrails] = useState({})
  const [isCapturing, setIsCapturing] = useState(false)

  const getEffectiveVehiclePosition = (vehicle) => {
    const rt = realTimeData?.[vehicle._id]
    if (rt?.gps?.coordinates && isValidCoords(rt.gps.coordinates)) {
      return [rt.gps.coordinates[1], rt.gps.coordinates[0]]
    }
    if (isValidCoords(vehicle.location?.coordinates)) {
      return [vehicle.location.coordinates[1], vehicle.location.coordinates[0]]
    }
    return null
  }

  const getEffectivePersonPosition = (person) => {
    if (person.hasReportedLocation && isValidCoords(person.location?.coordinates)) {
      return [person.location.coordinates[1], person.location.coordinates[0]]
    }
    return null
  }

  // Update trails for vehicles with jump segmentation
  useEffect(() => {
    vehicles.forEach((v) => {
      const pos = getEffectiveVehiclePosition(v)
      if (pos) {
        setTrails((prev) => {
          const raw = prev[v._id] || []
          const segments = Array.isArray(raw[0]?.[0]) ? raw : (raw.length > 0 ? [raw] : [])
          if (segments.length === 0) return { ...prev, [v._id]: [[pos]] }

          const lastSeg = segments[segments.length - 1]
          const lastPoint = lastSeg[lastSeg.length - 1]
          if (lastPoint[0] === pos[0] && lastPoint[1] === pos[1]) return prev

          const dist = getDistanceMeters(lastPoint, pos)
          // Si hay salto > 3km, iniciar nuevo tramo para no trazar líneas por el mar
          if (dist > 3000) {
            return { ...prev, [v._id]: [...segments, [pos]] }
          }

          const updatedLast = [...lastSeg, pos].slice(-250)
          return { ...prev, [v._id]: [...segments.slice(0, -1), updatedLast] }
        })
      }
    })
  }, [vehicles, realTimeData])

  // Update trails for people with jump segmentation
  useEffect(() => {
    people.forEach((p) => {
      const pos = getEffectivePersonPosition(p)
      if (pos) {
        setTrails((prev) => {
          const raw = prev[p._id] || []
          const segments = Array.isArray(raw[0]?.[0]) ? raw : (raw.length > 0 ? [raw] : [])
          if (segments.length === 0) return { ...prev, [p._id]: [[pos]] }

          const lastSeg = segments[segments.length - 1]
          const lastPoint = lastSeg[lastSeg.length - 1]
          if (lastPoint[0] === pos[0] && lastPoint[1] === pos[1]) return prev

          const dist = getDistanceMeters(lastPoint, pos)
          if (dist > 3000) {
            return { ...prev, [p._id]: [...segments, [pos]] }
          }

          const updatedLast = [...lastSeg, pos].slice(-250)
          return { ...prev, [p._id]: [...segments.slice(0, -1), updatedLast] }
        })
      }
    })
  }, [people])

  const handleClearTrails = () => setTrails({})

  const handleCaptureScreenshot = async () => {
    if (!mapContainerRef.current) return
    setIsCapturing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#1e293b',
      })
      const link = document.createElement('a')
      link.download = `mapa-unificado-einsoft-gps-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Error al capturar el mapa:', err)
      alert('Error al generar screenshot del mapa: ' + err.message)
    } finally {
      setIsCapturing(false)
    }
  }

  // Calculate Map Center & Zoom based on selections
  let mapCenter = defaultCenter
  let mapZoom = defaultZoom

  if (selectedVehicle) {
    const pos = getEffectiveVehiclePosition(selectedVehicle)
    if (pos) {
      mapCenter = pos
      mapZoom = 15
    }
  } else if (selectedPerson) {
    const pos = getEffectivePersonPosition(selectedPerson)
    if (pos) {
      mapCenter = pos
      mapZoom = 15
    }
  } else {
    // Gather all valid active positions
    const validPositions = []
    if (assetTypeFilter === 'all' || assetTypeFilter === 'vehicles') {
      vehicles.forEach(v => {
        const p = getEffectiveVehiclePosition(v)
        if (p) validPositions.push(p)
      })
    }
    if (assetTypeFilter === 'all' || assetTypeFilter === 'people') {
      people.forEach(person => {
        const p = getEffectivePersonPosition(person)
        if (p) validPositions.push(p)
      })
    }

    if (validPositions.length === 1) {
      mapCenter = validPositions[0]
      mapZoom = 14
    } else if (validPositions.length > 1) {
      const lats = validPositions.map(p => p[0])
      const lngs = validPositions.map(p => p[1])
      mapCenter = [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
      ]
      mapZoom = 12
    }
  }

  // Determine Visible Items
  const showVehicles = (assetTypeFilter === 'all' || assetTypeFilter === 'vehicles') && !selectedPerson
  const showPeople = (assetTypeFilter === 'all' || assetTypeFilter === 'people') && !selectedVehicle

  const visibleVehicles = showVehicles ? (selectedVehicle ? [selectedVehicle] : vehicles) : []
  const visiblePeople = showPeople ? (selectedPerson ? [selectedPerson] : people) : []

  const locatedVehiclesCount = vehicles.filter(v => getEffectiveVehiclePosition(v) !== null).length
  const locatedPeopleCount = people.filter(p => getEffectivePersonPosition(p) !== null).length

  return (
    <div ref={mapContainerRef} className="card h-full min-h-[520px] overflow-hidden flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm">
      {/* ── Card Header ── */}
      <div className="card-header flex items-center justify-between flex-wrap gap-2 p-4 border-b">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-black text-slate-900 flex items-center gap-1.5">
            <span>🗺️</span> Mapa Táctico en Vivo
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold">
              🚗 {locatedVehiclesCount} / {vehicles.length} Vehículos
            </span>
            <span className="text-[10px] bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold">
              📱 {locatedPeopleCount} / {people.length} Celulares
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearTrails}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-300 shadow-xs"
            title="Limpiar líneas de recorrido y trazas"
          >
            🧹 Limpiar Trazas
          </button>
          <button
            onClick={handleCaptureScreenshot}
            disabled={isCapturing}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
            title="Guardar captura de pantalla del mapa"
          >
            {isCapturing ? '📸 Capturando...' : '📸 Capturar'}
          </button>
        </div>
      </div>

      {/* ── Leaflet Map Container ── */}
      <div className="w-full h-[520px] overflow-hidden relative flex-1">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <ChangeView center={mapCenter} zoom={mapZoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render Trajectory Polyline Trails per Asset */}
          {Object.entries(trails).map(([assetId, trailData]) => {
            if (!trailData || trailData.length === 0) return null
            if (selectedVehicle && selectedVehicle._id !== assetId) return null
            if (selectedPerson && selectedPerson._id !== assetId) return null

            const isVehicle = vehicles.some(v => v._id === assetId)
            const isPerson = people.some(p => p._id === assetId)
            if (!isVehicle && !isPerson) return null

            const strokeColor = isVehicle ? '#2563eb' : '#7c3aed'
            const segments = Array.isArray(trailData[0]?.[0]) ? trailData : [trailData]

            return (
              <React.Fragment key={`trail-frag-${assetId}`}>
                {segments.map((segment, sIdx) => {
                  if (!segment || segment.length < 2) return null
                  const chevrons = generateDirectionChevrons(segment, 350)
                  return (
                    <React.Fragment key={`seg-frag-${assetId}-${sIdx}`}>
                      <Polyline
                        key={`trail-${assetId}-${sIdx}`}
                        positions={segment}
                        pathOptions={{
                          color: strokeColor,
                          weight: (selectedVehicle || selectedPerson) ? 6 : 4,
                          opacity: 0.85,
                          lineCap: 'round',
                          lineJoin: 'round',
                        }}
                      />
                      {chevrons.map((ch, cIdx) => (
                        <Marker
                          key={`map-chev-${assetId}-${sIdx}-${cIdx}`}
                          position={ch.position}
                          icon={L.divIcon({
                            html: `
                              <div style="transform: rotate(${ch.bearing}deg);" class="w-3 h-3 flex items-center justify-center drop-shadow select-none pointer-events-none opacity-85 text-white">
                                <svg viewBox="0 0 24 24" fill="currentColor" class="w-2.5 h-2.5">
                                  <path d="M12 2L2 22l10-4 10 4L12 2z"/>
                                </svg>
                              </div>
                            `,
                            className: '',
                            iconSize: [12, 12],
                            iconAnchor: [6, 6],
                          })}
                          interactive={false}
                        />
                      ))}
                    </React.Fragment>
                  )
                })}
              </React.Fragment>
            )
          })}

          {/* ── Render Vehicles ── */}
          {visibleVehicles.map((vehicle) => {
            const displayPosition = getEffectiveVehiclePosition(vehicle)
            if (!displayPosition) return null

            const isSelected = selectedVehicle?._id === vehicle._id
            const rtData = realTimeData?.[vehicle._id]
            const displaySpeed = rtData?.gps?.speed ?? vehicle.speed ?? 0
            const displayAddress = rtData?.location?.address || vehicle.location?.address || `${displayPosition[0].toFixed(4)}, ${displayPosition[1].toFixed(4)}`
            const status = vehicle.status || 'offline'
            const isAlert = status === 'alert' || !!rtData?.alert
            const color = STATUS_COLORS[status] || STATUS_COLORS.offline
            const icon = makeVehicleIcon(color, isSelected, isAlert)

            return (
              <Marker
                key={`veh-${vehicle._id}-${displayPosition[0]}-${displayPosition[1]}`}
                position={displayPosition}
                icon={icon}
                eventHandlers={{ click: () => onVehicleSelect && onVehicleSelect(vehicle) }}
                zIndexOffset={isAlert ? 2000 : isSelected ? 1000 : 100}
              >
                <Popup minWidth={220}>
                  <div className="text-xs p-1 space-y-1">
                    {isAlert && (
                      <div className="p-1 bg-red-600 text-white font-black text-center text-[10px] rounded animate-pulse">
                        🚨 ¡EMERGENCIA SOS ACTIVA!
                      </div>
                    )}
                    <p className="font-black text-slate-900 text-sm">🚗 {vehicle.licensePlate}</p>
                    <p className="text-slate-600">{vehicle.make} {vehicle.model} {vehicle.year && `• ${vehicle.year}`}</p>
                    <hr className="my-1" />
                    <p>
                      <span className="font-bold">Estado:</span>{' '}
                      <span className={`font-black ${status === 'active' ? 'text-emerald-600' : isAlert ? 'text-rose-600' : 'text-slate-500'}`}>
                        {isAlert ? '🚨 ¡EN ALERTA!' : status === 'active' ? '🟢 En ruta' : '⚪ Detenido'}
                      </span>
                    </p>
                    <p>
                      <span className="font-bold">Velocidad:</span> {Math.round(displaySpeed)} km/h
                    </p>
                    <p className="text-slate-500">📍 {displayAddress}</p>
                    <p className="text-slate-400 text-[10px]">🕐 {formatAge(vehicle.lastUpdate)}</p>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* ── Render People / Smartphones ── */}
          {visiblePeople.map((person, pIdx) => {
            const displayPosition = getEffectivePersonPosition(person)
            if (!displayPosition) return null

            const isSelected = selectedPerson?._id === person._id
            const isPanic = person.status === 'panic' || person.panicAlert?.active
            const isOffline = person.status === 'offline'
            const conn = getDeviceConnectionStatus(person.location?.timestamp)
            const colorObj = getPersonColor(person.name, pIdx)

            return (
              <Marker
                key={`per-${person._id}-${displayPosition[0]}-${displayPosition[1]}`}
                position={displayPosition}
                icon={makePersonDivIcon(person, isSelected, isPanic, isOffline, pIdx)}
                eventHandlers={{ click: () => onPersonSelect && onPersonSelect(person) }}
                zIndexOffset={isPanic ? 3000 : isSelected ? 2000 : 200}
              >
                <Popup minWidth={220}>
                  <div className="text-xs p-1 space-y-1">
                    {isPanic && (
                      <div className="p-1 bg-rose-600 text-white font-black text-center text-[10px] rounded animate-pulse">
                        🚨 ¡BOTÓN DE PÁNICO SOS ACTIVADO!
                      </div>
                    )}
                    <div className="flex items-center justify-between border-b pb-1">
                      <p className="font-black text-slate-900 text-sm flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorObj.stroke }}></span>
                        👤 {person.name}
                      </p>
                      <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${conn.badgeClass}`}>
                        {conn.label}
                      </span>
                    </div>

                    <p>
                      <span className="font-bold">Móvil / Tracker:</span>{' '}
                      <span className="font-mono text-purple-700 font-bold">{person.deviceId || person.trackerCode}</span>
                    </p>
                    <p>
                      <span className="font-bold">Batería:</span>{' '}
                      <span className="font-mono font-bold">{person.batteryLevel != null ? `${person.batteryLevel}%` : 'N/D'}</span>
                    </p>
                    <p className="text-slate-500">📍 {person.location?.address || `${displayPosition[0].toFixed(4)}, ${displayPosition[1].toFixed(4)}`}</p>
                    <p className="text-slate-400 text-[10px]">🕐 {formatAge(person.location?.timestamp)}</p>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* ── Footer Info Strip ── */}
      {selectedVehicle && (
        <div className="p-3 bg-blue-50 border-t border-blue-200 flex items-center justify-between text-xs">
          <div>
            <h3 className="font-black text-blue-900">🚗 {selectedVehicle.licensePlate} ({selectedVehicle.make} {selectedVehicle.model})</h3>
            <p className="text-blue-700">Estado: {selectedVehicle.status === 'active' ? '🟢 En ruta' : '⚪ Detenido'} • Velocidad: {selectedVehicle.speed || 0} km/h</p>
          </div>
          <button
            onClick={() => onVehicleSelect && onVehicleSelect(null)}
            className="text-blue-700 hover:text-blue-900 font-bold underline"
          >
            ✕ Quitar aislamiento
          </button>
        </div>
      )}

      {selectedPerson && (
        <div className="p-3 bg-purple-50 border-t border-purple-200 flex items-center justify-between text-xs">
          <div>
            <h3 className="font-black text-purple-900">👤 {selectedPerson.name} ({selectedPerson.deviceId || selectedPerson.trackerCode})</h3>
            <p className="text-purple-700">Batería: {selectedPerson.batteryLevel != null ? `${selectedPerson.batteryLevel}%` : 'N/D'} • Rol: {selectedPerson.roleDescription || 'Personal'}</p>
          </div>
          <button
            onClick={() => onPersonSelect && onPersonSelect(null)}
            className="text-purple-700 hover:text-purple-900 font-bold underline"
          >
            ✕ Quitar aislamiento
          </button>
        </div>
      )}
    </div>
  )
}
