import React, { useState } from 'react'
import { getDeviceConnectionStatus } from '../utils/deviceState'
import { apiClient } from '../services/api'

export default function VehicleList({
  vehicles = [],
  selectedVehicle,
  onSelectVehicle,
  onVehicleSelect,
  onDeleteVehicle,
  isLoading,
}) {
  const [pingingId, setPingingId] = useState(null)
  const [pingMessage, setPingMessage] = useState('')

  const handleSelect = onSelectVehicle || onVehicleSelect || (() => {})

  const handlePingLocation = async (e, vehicle) => {
    e.stopPropagation()
    handleSelect(vehicle)
    try {
      setPingingId(vehicle._id)
      const deviceId = vehicle.deviceIMEI || vehicle.licensePlate || vehicle._id
      await apiClient.post('/telemetry/command', {
        deviceId,
        command: 'LOCATE_NOW',
        targetType: 'vehicle',
      })
      setPingMessage(`📍 Localizando en mapa a ${vehicle.licensePlate}...`)
      setTimeout(() => setPingMessage(''), 4000)
    } catch (err) {
      setPingMessage(`⚠️ Error: ${err.response?.data?.error || err.message}`)
      setTimeout(() => setPingMessage(''), 4000)
    } finally {
      setTimeout(() => setPingingId(null), 1000)
    }
  }

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>Vehículos ({vehicles.length})</span>
        {pingMessage && (
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
            {pingMessage}
          </span>
        )}
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {vehicles.map(vehicle => {
          const conn = getDeviceConnectionStatus(vehicle.lastUpdate)
          const isAlert = vehicle.status === 'alert'

          return (
            <div
              key={vehicle._id}
              onClick={() => handleSelect(vehicle)}
              className={`p-3 rounded-xl cursor-pointer border-2 transition-all group relative ${isAlert
                ? 'border-red-500 bg-red-50/60 shadow-md shadow-red-900/10'
                : selectedVehicle?._id === vehicle._id
                ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                : 'border-gray-200 hover:border-blue-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    {vehicle.licensePlate}
                    {isAlert && <span className="text-xs bg-red-600 text-white font-black px-1.5 py-0.5 rounded animate-pulse">🚨 SOS</span>}
                  </h3>
                  <p className="text-xs text-gray-500">{vehicle.make} {vehicle.model}</p>
                  {vehicle.deviceIMEI && (
                    <p className="text-[10px] text-blue-600 font-mono mt-0.5">
                      📟 {vehicle.deviceIMEI} | {vehicle.simCardNumber || 'Sin SIM'}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {/* Dynamic 3-state connection badge */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isAlert ? 'bg-red-600 text-white animate-pulse' : conn.badgeClass} flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isAlert ? 'bg-white' : conn.dotClass}`}></span>
                    {isAlert ? '🚨 EN PÁNICO' : conn.label}
                  </span>

                  <div className="flex items-center gap-1 mt-1">
                    {/* Ping / Localizar Ahora button */}
                    <button
                      onClick={(e) => handlePingLocation(e, vehicle)}
                      disabled={pingingId === vehicle._id}
                      title="Solicitar posición GPS inmediata al dispositivo"
                      className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-all disabled:opacity-50"
                    >
                      {pingingId === vehicle._id ? '⏳' : '📍 Ping'}
                    </button>

                    {onDeleteVehicle && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm(`¿Eliminar el vehículo "${vehicle.licensePlate}"?`)) {
                            onDeleteVehicle(vehicle._id)
                          }
                        }}
                        title="Eliminar vehículo"
                        className="text-xs p-1 hover:bg-red-100 rounded text-red-600 transition-all opacity-60 hover:opacity-100"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600 flex justify-between">
                <p>Velocidad: <span className="font-medium">{vehicle.speed || 0} km/h</span></p>
                <p>Combustible: <span className="font-medium text-orange-600">{vehicle.sensors?.fuel || '0'}%</span></p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
