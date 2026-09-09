import React, { useState } from 'react'
import { apiClient } from '../services/api'

export default function FuelCutModal({ isOpen, onClose, vehicle, onStatusChange }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [requiresPin, setRequiresPin] = useState(false)
  const [pin, setPin] = useState('')

  if (!isOpen) return null

  const isAlreadyCut = vehicle?.motorCutStatus === true

  const handleConfirm = async () => {
    setIsProcessing(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const targetState = !isAlreadyCut
      const vehicleId = vehicle?._id || 'mock-id'

      if (vehicle?._id) {
        await apiClient.post(`/vehicles/${vehicleId}/motor-cut`, {
          activate: targetState,
          rules: { speedThreshold: 15, safeStop: true },
        })
      }

      setSuccessMessage(
        targetState
          ? 'Corte de combustible activado exitosamente. La inyección ha sido detenida.'
          : 'Corte de combustible desactivado. Motor restablecido para encendido normal.'
      )

      if (onStatusChange) {
        onStatusChange(targetState)
      }

      setTimeout(() => {
        setSuccessMessage(null)
        onClose()
      }, 1800)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar comando de inmovilización a la unidad.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Card Body - Matching Image 2 style */}
        <div className="p-6 text-center space-y-4">
          {/* Triangle Warning Icon */}
          <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center text-3xl mx-auto text-red-600 shadow-inner">
            ⚠️
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
              {isAlreadyCut
                ? '¿Deseas restablecer el suministro de combustible?'
                : '¿Estás seguro de activar el corte de combustible?'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {vehicle?.plate ? `Unidad vinculada: ${vehicle.plate}` : 'Vehículo seleccionado'}
            </p>
          </div>

          {/* Vehículo Info Chip */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-left text-xs space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Estado Actual:</span>
              <span className={`font-black ${isAlreadyCut ? 'text-red-600' : 'text-emerald-600'}`}>
                {isAlreadyCut ? '⛔ INMOVILIZADO' : '🟢 MOTOR HABILITADO'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Velocidad:</span>
              <span className="font-semibold text-slate-700">
                {vehicle?.speed !== undefined ? `${vehicle.speed} km/h` : '0 km/h (Detenido)'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
              Protocolo de parada segura: Si el vehículo está en marcha, se activará de forma progresiva.
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 font-medium">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 font-bold">
              {successMessage}
            </div>
          )}

          {/* Action Buttons - Matching Image 2: Rojo 'Confirmar', Gris 'Volver' */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConfirm}
              className={`py-3 px-4 font-black rounded-xl text-xs text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                isAlreadyCut
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isProcessing ? 'Enviando...' : isAlreadyCut ? 'Restablecer' : 'Confirmar'}
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              className="py-3 px-4 font-bold rounded-xl text-xs bg-slate-400 hover:bg-slate-500 text-white transition-all active:scale-95"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
