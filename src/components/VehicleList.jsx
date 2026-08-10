import React from 'react'

export default function VehicleList({ vehicles, selectedVehicle, onSelectVehicle, onDeleteVehicle, isLoading }) {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="card-header">Vehículos ({vehicles.length})</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {vehicles.map(vehicle => (
          <div
            key={vehicle._id}
            onClick={() => onSelectVehicle(vehicle)}
            className={`p-3 rounded-xl cursor-pointer border-2 transition-all group relative ${selectedVehicle?._id === vehicle._id
                ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                : 'border-gray-200 hover:border-blue-300 hover:bg-slate-50/50'
              }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  {vehicle.licensePlate}
                </h3>
                <p className="text-xs text-gray-500">{vehicle.make} {vehicle.model}</p>
                {vehicle.deviceIMEI && (
                  <p className="text-[10px] text-blue-600 font-mono mt-0.5">
                    📟 {vehicle.deviceIMEI} | {vehicle.simCardNumber || 'Sin SIM'}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${vehicle.status === 'active' ? 'bg-green-100 text-green-700' :
                    vehicle.status === 'offline' ? 'bg-gray-100 text-gray-700' :
                      vehicle.status === 'alert' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                  }`}>
                  {vehicle.status}
                </span>
                {vehicle.lastUpdate && (
                  <span className="text-[9px] text-gray-400">
                    {new Date(vehicle.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}

                {onDeleteVehicle && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`¿Eliminar el vehículo "${vehicle.licensePlate}"?`)) {
                        onDeleteVehicle(vehicle._id)
                      }
                    }}
                    title="Eliminar vehículo"
                    className="mt-1 opacity-60 hover:opacity-100 text-xs p-1 hover:bg-red-100 rounded text-red-600 transition-all"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600 flex justify-between">
              <p>Velocidad: <span className="font-medium">{vehicle.speed} km/h</span></p>
              <p>Combustible: <span className="font-medium text-orange-600">{vehicle.sensors?.fuel || '0'}%</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
