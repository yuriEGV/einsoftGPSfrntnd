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
      setPingMessage(`Localizando en mapa: ${vehicle.licensePlate}`)
      setTimeout(() => setPingMessage(''), 4000)
    } catch (err) {
      setPingMessage(`Error: ${err.response?.data?.error || err.message}`)
      setTimeout(() => setPingMessage(''), 4000)
    } finally {
      setTimeout(() => setPingingId(null), 1000)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse p-4">
        <div className="h-64 bg-slate-900 rounded-xl"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
          Móviles en Flota ({vehicles.length})
        </span>
        {pingMessage && (
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
            {pingMessage}
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {vehicles.map(vehicle => {
          const conn = getDeviceConnectionStatus(vehicle.lastUpdate)
          const isAlert = vehicle.status === 'alert'
          const isSelected = selectedVehicle?._id === vehicle._id

          return (
            <div
              key={vehicle._id}
              onClick={() => handleSelect(vehicle)}
              className={`p-3 rounded-xl cursor-pointer border transition-all group relative ${
                isAlert
                  ? 'border-red-500/80 bg-red-950/30 shadow-md shadow-red-950/40'
                  : isSelected
                  ? 'border-cyan-500/80 bg-cyan-950/20'
                  : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-100 flex items-center gap-2 font-mono text-sm">
                    {vehicle.licensePlate}
                    {isAlert && (
                      <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded uppercase animate-pulse">
                        SOS
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">{vehicle.make} {vehicle.model}</p>
                  {vehicle.deviceIMEI && (
                    <p className="text-[10px] text-cyan-400/90 font-mono mt-0.5">
                      IMEI: {vehicle.deviceIMEI}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isAlert
                      ? 'bg-red-600 text-white animate-pulse'
                      : conn.isOnline
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}>
                    {isAlert ? '🚨 EN PÁNICO' : conn.label}
                  </span>

                  <div className="flex items-center gap-1 mt-0.5">
                    <button
                      onClick={(e) => handlePingLocation(e, vehicle)}
                      disabled={pingingId === vehicle._id}
                      title="Solicitar telemetría GPS inmediata"
                      className="text-[10px] font-semibold px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 rounded transition-all disabled:opacity-50"
                    >
                      {pingingId === vehicle._id ? '⏳' : '📍 Ping'}
                    </button>

                    {onDeleteVehicle && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm(`¿Eliminar la unidad "${vehicle.licensePlate}"?`)) {
                            onDeleteVehicle(vehicle._id)
                          }
                        }}
                        title="Eliminar móvil"
                        className="text-xs p-1 hover:bg-red-950/40 rounded text-slate-500 hover:text-red-400 transition-all"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400 flex justify-between">
                <span>Velocidad: <strong className="text-slate-200">{vehicle.speed || 0} km/h</strong></span>
                <span>Nivel Est.: <strong className="text-slate-200">{vehicle.sensors?.fuel || '100'}%</strong></span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
