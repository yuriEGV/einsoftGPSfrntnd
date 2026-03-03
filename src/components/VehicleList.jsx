import React from 'react'

export default function VehicleList({ vehicles, selectedVehicle, onSelectVehicle, isLoading }) {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="card-header">Vehicles ({vehicles.length})</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {vehicles.map(vehicle => (
          <div
            key={vehicle._id}
            onClick={() => onSelectVehicle(vehicle)}
            className={`p-3 rounded-lg cursor-pointer border-2 transition-all ${
              selectedVehicle?._id === vehicle._id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{vehicle.licensePlate}</h3>
                <p className="text-xs text-gray-500">{vehicle.model}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                vehicle.status === 'active' ? 'bg-green-100 text-green-700' :
                vehicle.status === 'offline' ? 'bg-gray-100 text-gray-700' :
                vehicle.status === 'alert' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {vehicle.status}
              </span>
            </div>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <p>Speed: <span className="font-medium">{vehicle.speed} km/h</span></p>
              <p>Fuel: <span className="font-medium">{vehicle.sensors?.fuel || 'N/A'}%</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
