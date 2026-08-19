import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon issue with Vite/Webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// ─── Custom colored icons per vehicle status ───────────────────────────────────
function makeIcon(color, selected = false, isAlert = false) {
  if (isAlert) {
    // 🚨 Pulsating radar emergency marker for vehicles in panic/alert
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

const STATUS_COLORS = {
  active: '#10b981',   // emerald-500
  alert: '#ef4444',    // red-500
  offline: '#6b7280',  // gray-500
  inactive: '#9ca3af', // gray-400
}

// ─── ChangeView: pans map to new center when selectedVehicle changes ───────────
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

// ─── isValidCoordinates ────────────────────────────────────────────────────────
function isValidCoords(coords) {
  if (!coords || !Array.isArray(coords) || coords.length < 2) return false
  const [lng, lat] = coords
  if (typeof lng !== 'number' || typeof lat !== 'number') return false
  if (isNaN(lng) || isNaN(lat)) return false
  if (lng === 0 && lat === 0) return false
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
  return true
}

// ─── formatAge ────────────────────────────────────────────────────────────────
function formatAge(lastUpdate) {
  if (!lastUpdate) return 'Sin datos'
  const mins = Math.round((Date.now() - new Date(lastUpdate)) / 60000)
  if (mins < 1) return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  return `Hace ${Math.floor(hrs / 24)} días`
}

export default function MapComponent({ vehicles = [], selectedVehicle, onVehicleSelect, realTimeData }) {
  const mapContainerRef = useRef(null)
  const [trails, setTrails] = useState({})
  const [isCapturing, setIsCapturing] = useState(false)

  // Default center: Valparaíso (V Región)
  const defaultCenter = [-33.04, -71.61]
  const defaultZoom = 13

  // Compute effective positions merging realTimeData (socket/polling overrides)
  const getEffectivePosition = (vehicle) => {
    const rtData = realTimeData?.[vehicle._id]
    if (rtData?.gps?.coordinates && isValidCoords(rtData.gps.coordinates)) {
      return [rtData.gps.coordinates[1], rtData.gps.coordinates[0]]
    }
    const coords = vehicle.location?.coordinates
    if (isValidCoords(coords)) {
      return [coords[1], coords[0]]
    }
    return null
  }

  // Update trails when new positions arrive
  useEffect(() => {
    vehicles.forEach(v => {
      const pos = getEffectivePosition(v)
      if (pos) {
        setTrails(prev => {
          const current = prev[v._id] || []
          const last = current[current.length - 1]
          if (!last || Math.abs(last[0] - pos[0]) > 0.00005 || Math.abs(last[1] - pos[1]) > 0.00005) {
            return {
              ...prev,
              [v._id]: [...current, pos].slice(-50) // keep last 50 points
            }
          }
          return prev
        })
      }
    })
  }, [vehicles, realTimeData])

  // Clear movement trails
  const handleClearTrails = () => {
    setTrails({})
  }

  // Screenshot capture using html2canvas
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
      link.download = `mapa-flota-einsoft-gps-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Error al capturar el mapa:', err)
      alert('Error al generar screenshot del mapa: ' + err.message)
    } finally {
      setIsCapturing(false)
    }
  }

  // Determine map center: selected vehicle's location, else center of valid vehicles
  let mapCenter = defaultCenter
  let mapZoom = defaultZoom

  if (selectedVehicle) {
    const pos = getEffectivePosition(selectedVehicle)
    if (pos) {
      mapCenter = pos
      mapZoom = 15
    }
  } else {
    // Auto-center on fleet if no vehicle selected
    const validVehicles = vehicles.filter(v => getEffectivePosition(v) !== null)
    if (validVehicles.length === 1) {
      mapCenter = getEffectivePosition(validVehicles[0])
      mapZoom = 14
    } else if (validVehicles.length > 1) {
      const positions = validVehicles.map(v => getEffectivePosition(v)).filter(Boolean)
      const lats = positions.map(p => p[0])
      const lngs = positions.map(p => p[1])
      mapCenter = [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
      ]
      mapZoom = 11
    }
  }

  const vehiclesWithLocation = vehicles.filter(v => isValidCoords(v.location?.coordinates) || !!realTimeData?.[v._id]?.gps?.coordinates)
  const vehiclesWithoutLocation = vehicles.filter(v => !isValidCoords(v.location?.coordinates) && !realTimeData?.[v._id]?.gps?.coordinates)

  return (
    <div ref={mapContainerRef} className="card h-full min-h-[500px] overflow-hidden flex flex-col">
      <div className="card-header flex items-center justify-between flex-wrap gap-2">
        <span className="flex items-center gap-2">
          🗺️ Mapa de Flota en Tiempo Real
          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
            {vehiclesWithLocation.length} ubicados
          </span>
          {vehiclesWithoutLocation.length > 0 && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
              {vehiclesWithoutLocation.length} sin GPS
            </span>
          )}
        </span>

        {/* Action buttons: Clear Trails & Screenshot */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearTrails}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border border-slate-300 shadow-sm"
            title="Limpiar líneas de recorrido y trazas del mapa"
          >
            🧹 Limpiar Trazas
          </button>
          <button
            onClick={handleCaptureScreenshot}
            disabled={isCapturing}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
            title="Guardar imagen / captura de pantalla del mapa actual"
          >
            {isCapturing ? '📸 Capturando...' : '📸 Capturar Mapa'}
          </button>
        </div>
      </div>
      <div className="w-full h-[500px] overflow-hidden relative">
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

          {/* Render Trajectory Polyline Trails */}
          {Object.entries(trails).map(([vId, points]) => {
            if (!points || points.length < 2) return null
            const isSel = selectedVehicle?._id === vId
            return (
              <Polyline
                key={`trail-${vId}`}
                positions={points}
                pathOptions={{
                  color: isSel ? '#2563eb' : '#6366f1',
                  weight: isSel ? 5 : 3,
                  opacity: isSel ? 0.9 : 0.6,
                  dashArray: '6, 8',
                }}
              />
            )
          })}

          {vehiclesWithLocation.map((vehicle) => {
            const isSelected = selectedVehicle?._id === vehicle._id
            const displayPosition = getEffectivePosition(vehicle)
            if (!displayPosition) return null

            // Use realtime data for speed/status if available
            const rtData = realTimeData?.[vehicle._id]
            const displaySpeed = rtData?.gps?.speed ?? vehicle.speed ?? 0
            const displayAddress = rtData?.location?.address || vehicle.location?.address || `${displayPosition[0].toFixed(4)}, ${displayPosition[1].toFixed(4)}`
            const status = vehicle.status || 'offline'
            const isAlert = status === 'alert' || !!rtData?.alert
            const color = STATUS_COLORS[status] || STATUS_COLORS.offline
            const icon = makeIcon(color, isSelected, isAlert)

            // Key includes position so marker re-renders when position changes
            const markerKey = `${vehicle._id}-${status}-${displayPosition[0].toFixed(5)}-${displayPosition[1].toFixed(5)}`

            return (
              <Marker
                key={markerKey}
                position={displayPosition}
                icon={icon}
                eventHandlers={{ click: () => onVehicleSelect && onVehicleSelect(vehicle) }}
                zIndexOffset={isAlert ? 2000 : isSelected ? 1000 : 0}
              >
                <Popup minWidth={220}>
                  <div className="text-sm p-1">
                    {isAlert && (
                      <div className="mb-2 p-1.5 bg-red-600 text-white font-black text-center text-xs rounded animate-pulse">
                        🚨 ¡EMERGENCIA SOS ACTIVA!
                      </div>
                    )}
                    <p className="font-black text-gray-900 text-base">{vehicle.licensePlate}</p>
                    <p className="text-gray-600">{vehicle.make} {vehicle.model} {vehicle.year && `• ${vehicle.year}`}</p>
                    <hr className="my-1.5" />
                    <p className="text-xs">
                      <span className="font-semibold">Estado:</span>{' '}
                      <span className={`font-bold capitalize ${status === 'active' ? 'text-emerald-600' : isAlert ? 'text-red-600 font-black' : 'text-gray-500'}`}>
                        {isAlert ? '🚨 ¡EN PÁNICO / ALERTA!' : status === 'active' ? '🟢 En ruta' : '⚪ Detenido'}
                      </span>
                    </p>
                    <p className="text-xs mt-1">
                      <span className="font-semibold">Velocidad:</span> {Math.round(displaySpeed)} km/h
                      {rtData && <span className="ml-1 text-emerald-600 font-bold text-[10px]">● VIVO</span>}
                    </p>
                    <p className="text-xs mt-1">
                      <span className="font-semibold">Ubicación:</span> {displayAddress}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      🕐 {formatAge(vehicle.lastUpdate)}
                    </p>
                    {vehicle.deviceIMEI && (
                      <p className="text-[10px] text-gray-400 font-mono mt-1">IMEI: {vehicle.deviceIMEI}</p>
                    )}
                    {onVehicleSelect && (
                      <button
                        onClick={() => onVehicleSelect(vehicle)}
                        className="mt-2 w-full text-center text-xs font-bold bg-blue-600 text-white py-1 px-2 rounded hover:bg-blue-700 transition-colors"
                      >
                        Ver ficha completa →
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* Vehicles without GPS location */}
      {vehiclesWithoutLocation.length > 0 && (
        <div className="px-4 pb-3 pt-2 bg-amber-50 border-t border-amber-200">
          <p className="text-xs font-bold text-amber-700 mb-1">⚠️ Vehículos sin ubicación GPS disponible:</p>
          <div className="flex flex-wrap gap-1.5">
            {vehiclesWithoutLocation.map(v => (
              <span
                key={v._id}
                onClick={() => onVehicleSelect && onVehicleSelect(v)}
                className="text-[10px] bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded-full cursor-pointer hover:bg-amber-100 font-bold transition-colors"
                title={`${v.make} ${v.model} — IMEI: ${v.deviceIMEI || 'Sin vincular'}`}
              >
                🚗 {v.licensePlate} {!v.deviceIMEI && '(Sin IMEI)'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Selected vehicle info card */}
      {selectedVehicle && (
        <div className="p-3 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-blue-900">{selectedVehicle.licensePlate}</h3>
              <p className="text-xs text-blue-700">{selectedVehicle.make} {selectedVehicle.model}</p>
            </div>
            <div className="text-right text-xs text-blue-600 space-y-0.5">
              <p>⚡ {selectedVehicle.speed || 0} km/h</p>
              <p>📍 {selectedVehicle.location?.city || 'Sin ciudad'}</p>
              <p>🕐 {formatAge(selectedVehicle.lastUpdate)}</p>
            </div>
          </div>
          {!isValidCoords(selectedVehicle.location?.coordinates) && (
            <p className="text-xs text-amber-600 mt-1.5 font-medium">
              ⚠️ Este vehículo aún no tiene una ubicación GPS registrada.
              {!selectedVehicle.deviceIMEI ? ' Vincula un dispositivo GPS (IMEI) en la ficha del vehículo.' : ' Esperando primer reporte del dispositivo...'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
