import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
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
function makeIcon(color, selected = false) {
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
// Returns true only if the coordinates are a real non-null position
function isValidCoords(coords) {
  if (!coords || !Array.isArray(coords) || coords.length < 2) return false
  const [lng, lat] = coords
  if (typeof lng !== 'number' || typeof lat !== 'number') return false
  if (isNaN(lng) || isNaN(lat)) return false
  // [0, 0] is the default "no data" value — ignore it
  if (lng === 0 && lat === 0) return false
  // Validate reasonable world bounds
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
  // Default center: Valparaíso (V Región)
  const defaultCenter = [-33.04, -71.61]
  const defaultZoom = 13

  // Compute effective positions merging realTimeData (socket/polling overrides)
  // This ensures the map always shows the freshest coordinates available
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
    <div className="card h-full min-h-[500px] overflow-hidden">
      <div className="card-header flex items-center justify-between">
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
      </div>
      <div className="w-full h-[500px] overflow-hidden">
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

          {vehiclesWithLocation.map((vehicle) => {
            const isSelected = selectedVehicle?._id === vehicle._id
            const displayPosition = getEffectivePosition(vehicle)
            if (!displayPosition) return null

            // Use realtime data for speed/status if available
            const rtData = realTimeData?.[vehicle._id]
            const displaySpeed = rtData?.gps?.speed ?? vehicle.speed ?? 0
            const displayAddress = rtData?.location?.address || vehicle.location?.address || `${displayPosition[0].toFixed(4)}, ${displayPosition[1].toFixed(4)}`
            const status = vehicle.status || 'offline'
            const color = STATUS_COLORS[status] || STATUS_COLORS.offline
            const icon = makeIcon(color, isSelected)

            // Key includes position so marker re-renders when position changes
            const markerKey = `${vehicle._id}-${displayPosition[0].toFixed(5)}-${displayPosition[1].toFixed(5)}`

            return (
              <Marker
                key={markerKey}
                position={displayPosition}
                icon={icon}
                eventHandlers={{ click: () => onVehicleSelect && onVehicleSelect(vehicle) }}
                zIndexOffset={isSelected ? 1000 : 0}
              >
                <Popup minWidth={200}>
                  <div className="text-sm p-1">
                    <p className="font-black text-gray-900 text-base">{vehicle.licensePlate}</p>
                    <p className="text-gray-600">{vehicle.make} {vehicle.model} {vehicle.year && `• ${vehicle.year}`}</p>
                    <hr className="my-1.5" />
                    <p className="text-xs">
                      <span className="font-semibold">Estado:</span>{' '}
                      <span className={`font-bold capitalize ${status === 'active' ? 'text-emerald-600' : status === 'alert' ? 'text-red-600' : 'text-gray-500'}`}>
                        {status === 'active' ? '🟢 En ruta' : status === 'alert' ? '🔴 Alerta' : '⚪ Detenido'}
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
