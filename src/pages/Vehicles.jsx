import React from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/api'
import VehicleList from '../components/VehicleList'

export default function Vehicles() {
  const navigate = useNavigate()

  const { data: vehicles = [], isLoading } = useQuery('vehicles', async () => {
    const response = await apiClient.get('/vehicles')
    return response.data
  })

  const handleSelectVehicle = (vehicle) => {
    navigate(`/vehicles/${vehicle._id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Vehicles</h1>
        <p className="text-sm text-gray-500">
          Total: {vehicles.length} vehicles
        </p>
      </div>

      <VehicleList
        vehicles={vehicles}
        selectedVehicle={null}
        onSelectVehicle={handleSelectVehicle}
        isLoading={isLoading}
      />
    </div>
  )
}

