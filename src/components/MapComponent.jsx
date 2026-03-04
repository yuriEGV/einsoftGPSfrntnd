import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

// Helper to center map
function ChangeView({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center && center[0] !== 0) {
      map.setView(center, zoom)
    }
  }, [center, zoom, map])
  return null
}

export default function MapComponent({ vehicles, selectedVehicle, onVehicleSelect, realTimeData }) {
  const defaultCenter = [-33.4372, -70.6506] // Santiago, Chile
  const [mapCenter, setMapCenter] = useState(defaultCenter)
  const [zoom, setZoom] = useState(13)

  useEffect(() => {
    if (selectedVehicle) {
      const coords = selectedVehicle.location?.coordinates
      if (coords && coords.length === 2) {
        // GeoJSON [lng, lat] -> Leaflet [lat, lng]
        setMapCenter([coords[1], coords[0]])
        setZoom(16)
      }
    }
  }, [selectedVehicle])

  return (
    <div className="card h-full min-h-[500px]">
      <h2 className="card-header">Mapa de Flota (OpenStreetMap)</h2>
      <div className="w-full h-[500px] rounded-lg overflow-hidden border border-gray-200">
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <ChangeView center={mapCenter} zoom={zoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {vehicles.map((vehicle) => {
            const coords = vehicle.location?.coordinates
            if (!coords || coords[0] === 0) return null

            // Marker position [lat, lng]
            const position = [coords[1], coords[0]]
            const isSelected = selectedVehicle?._id === vehicle._id

            return (
              <Marker
                key={vehicle._id}
                position={position}
                eventHandlers={{
                  click: () => onVehicleSelect(vehicle),
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{vehicle.licensePlate}</p>
                    <p>{vehicle.make} {vehicle.model}</p>
                    <p className="text-xs text-gray-500">Velocidad: {vehicle.speed} km/h</p>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {selectedVehicle && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900">{selectedVehicle.licensePlate}</h3>
          <div className="text-sm text-blue-700 mt-2 space-y-1">
            <p>Velocidad: {selectedVehicle.speed} km/h</p>
            <p>Estado: <span className="font-medium capitalize">{selectedVehicle.status}</span></p>
            <p>Dispositivo: {selectedVehicle.deviceIMEI || 'No vinculado'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
