import React, { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// Check if token is valid (not demo/placeholder)
const isValidToken = MAPBOX_TOKEN && !MAPBOX_TOKEN.includes('demo') && !MAPBOX_TOKEN.includes('test')

if (isValidToken) {
  mapboxgl.accessToken = MAPBOX_TOKEN
}

export default function MapComponent({ vehicles, selectedVehicle, onVehicleSelect, realTimeData }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markers = useRef({})
  const [showTokenWarning, setShowTokenWarning] = useState(!isValidToken)

  // Initialize map
  useEffect(() => {
    if (map.current) return

    // Only initialize Mapbox if token is valid
    if (!isValidToken) {
      // Show message in development
      if (mapContainer.current) {
        mapContainer.current.innerHTML = `
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; flex-direction: column; text-align: center;">
            <svg style="width: 64px; height: 64px; margin-bottom: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <h2 style="margin: 0; font-size: 24px; margin-bottom: 8px;">Map in Development Mode</h2>
            <p style="margin: 0 0 16px 0; font-size: 14px; opacity: 0.9;">Using demo data visualization</p>
            <div style="background: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 8px; font-size: 12px;">
              <p style="margin: 0; margin-bottom: 8px;">📍 ${vehicles.length} vehicles loaded</p>
              <p style="margin: 0;">To use real maps: Add VITE_MAPBOX_TOKEN to .env</p>
            </div>
          </div>
        `
      }
      return
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.5, 40], // Default center (NYC area)
      zoom: 12,
      pitch: 45,
      bearing: 0,
    })

    map.current.on('load', () => {
      // Add custom layers or sources here
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update vehicle markers
  useEffect(() => {
    if (!map.current) return

    vehicles.forEach(vehicle => {
      const key = vehicle._id
      const [lng, lat] = vehicle.location?.coordinates || [0, 0]

      // Create marker element
      const el = document.createElement('div')
      el.className = 'vehicle-marker'
      el.style.backgroundColor = selectedVehicle?._id === vehicle._id ? '#3b82f6' : '#10b981'
      el.innerHTML = `
        <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l4 8h5l-4 3 2 8-7-5-7 5 2-8-4-3h5z"/>
        </svg>
      `
      el.style.cursor = 'pointer'
      el.addEventListener('click', () => onVehicleSelect(vehicle))

      if (markers.current[key]) {
        markers.current[key].setLngLat([lng, lat])
      } else {
        const marker = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map.current)
        markers.current[key] = marker

        // Add popup
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setText(`${vehicle.licensePlate} - Speed: ${vehicle.speed} km/h`)
        marker.setPopup(popup)
      }
    })

    // Remove markers for deleted vehicles
    Object.keys(markers.current).forEach(key => {
      if (!vehicles.find(v => v._id === key)) {
        markers.current[key].remove()
        delete markers.current[key]
      }
    })
  }, [vehicles, selectedVehicle])

  // Update map center on selected vehicle
  useEffect(() => {
    if (selectedVehicle && map.current) {
      const [lng, lat] = selectedVehicle.location?.coordinates || [0, 0]
      map.current.flyTo({
        center: [lng, lat],
        zoom: 15,
        duration: 1000,
      })
    }
  }, [selectedVehicle])

  return (
    <div className="card h-full min-h-[500px]">
      <h2 className="card-header">Fleet Map</h2>
      <div ref={mapContainer} className="w-full h-96 rounded-lg mapbox-container" />
      
      {selectedVehicle && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900">{selectedVehicle.licensePlate}</h3>
          <div className="text-sm text-blue-700 mt-2 space-y-1">
            <p>Speed: {selectedVehicle.speed} km/h</p>
            <p>Status: <span className="font-medium capitalize">{selectedVehicle.status}</span></p>
            <p>Driver: {selectedVehicle.assignedDriver || 'Unassigned'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
