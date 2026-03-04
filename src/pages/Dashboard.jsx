import React, { useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { apiClient } from '../services/api'
import MapComponent from '../components/MapComponent'
import VehicleList from '../components/VehicleList'
import AlertsPanel from '../components/AlertsPanel'
import StatsDashboard from '../components/StatsDashboard'
import { setupSocketConnection } from '../services/socket'

export default function Dashboard() {
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [socket, setSocket] = useState(null)
  const [realTimeData, setRealTimeData] = useState({})

  // Fetch vehicles with polling fallback for Vercel
  const { data: vehicles = [], isLoading } = useQuery('vehicles', async () => {
    const response = await apiClient.get('/vehicles')
    return response.data
  }, {
    refetchInterval: 5000, // Sync every 5 seconds as fallback for Socket.io
  })

  // Fetch alerts
  const { data: alerts = [] } = useQuery('alerts', async () => {
    const response = await apiClient.get('/alerts', { params: { limit: 10 } })
    return response.data
  }, {
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  // Setup WebSocket
  useEffect(() => {
    const newSocket = setupSocketConnection()
    setSocket(newSocket)

    newSocket.on('location_update', (data) => {
      setRealTimeData(prev => ({
        ...prev,
        [data.vehicleId]: data
      }))
    })

    newSocket.on('alert', (alert) => {
      console.log('Real-time alert:', alert)
    })

    if (selectedVehicle) {
      newSocket.emit('subscribe_vehicle', selectedVehicle._id)
    }

    return () => {
      if (selectedVehicle) {
        newSocket.emit('unsubscribe_vehicle', selectedVehicle._id)
      }
    }
  }, [selectedVehicle])

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Panel de flota</h1>
        <div className="text-sm text-gray-500">
          {vehicles.length} vehículos • {alerts.length} alertas activas
        </div>
      </div>

      {/* Resumen */}
      <StatsDashboard vehicles={vehicles} alerts={alerts} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <MapComponent
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onVehicleSelect={setSelectedVehicle}
            realTimeData={realTimeData}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vehicle List */}
          <VehicleList
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
            isLoading={isLoading}
          />

          {/* Alerts */}
          <AlertsPanel alerts={alerts.slice(0, 5)} />
        </div>
      </div>
    </div>
  )
}
