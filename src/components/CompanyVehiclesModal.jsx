import React, { useState, useEffect } from 'react'
import { apiClient } from '../services/api'

export default function CompanyVehiclesModal({ isOpen, onClose, company, onUpdated }) {
  const [assignedVehicles, setAssignedVehicles] = useState([])
  const [allFleetVehicles, setAllFleetVehicles] = useState([])
  const [selectedVehicleToAssign, setSelectedVehicleToAssign] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  // Sub-formulario para crear un nuevo vehículo directo para esta empresa
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [newVehicle, setNewVehicle] = useState({
    licensePlate: '',
    make: '',
    model: '',
    year: '',
    color: '',
  })

  useEffect(() => {
    if (isOpen && company) {
      loadData()
      setFeedbackMsg(null)
      setErrorMsg(null)
      setShowQuickCreate(false)
      setSelectedVehicleToAssign('')
    }
  }, [isOpen, company])

  const loadData = async () => {
    if (!company) return
    setIsLoading(true)
    try {
      // 1. Cargar vehículos asignados a esta empresa
      const resAssigned = await apiClient.get(`/companies/${company._id}/vehicles`)
      setAssignedVehicles(resAssigned.data || [])

      // 2. Cargar todos los vehículos para el selector de asignación
      const resAll = await apiClient.get('/vehicles')
      setAllFleetVehicles(resAll.data || [])
    } catch (err) {
      console.warn('Error loading company vehicles:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !company) return null

  // Filtrar vehículos disponibles que NO estén ya asignados a esta empresa
  const availableToAssign = allFleetVehicles.filter(
    (v) => !v.company || (typeof v.company === 'object' ? v.company._id !== company._id : v.company !== company._id)
  )

  // Asignar un vehículo existente a esta empresa
  const handleAssignVehicle = async () => {
    if (!selectedVehicleToAssign) return
    setIsProcessing(true)
    setErrorMsg(null)
    setFeedbackMsg(null)

    try {
      await apiClient.post(`/companies/${company._id}/assign-vehicles`, {
        vehicleIds: [selectedVehicleToAssign],
      })
      setFeedbackMsg('✅ Vehículo asignado a la empresa correctamente.')
      setSelectedVehicleToAssign('')
      await loadData()
      if (onUpdated) onUpdated()
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error al asignar el vehículo.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Desasignar un vehículo de esta empresa
  const handleUnassignVehicle = async (vehicleId, plate) => {
    if (!window.confirm(`¿Deseas desasignar el vehículo ${plate} de ${company.name}?`)) return
    setIsProcessing(true)
    setErrorMsg(null)
    setFeedbackMsg(null)

    try {
      await apiClient.post(`/companies/${company._id}/unassign-vehicle`, {
        vehicleId,
      })
      setFeedbackMsg(`Vehículo ${plate} desasignado de la empresa.`)
      await loadData()
      if (onUpdated) onUpdated()
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error al desasignar el vehículo.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Crear y dar de alta un nuevo vehículo asignado directamente a esta empresa
  const handleQuickCreate = async (e) => {
    e.preventDefault()
    if (!newVehicle.licensePlate.trim() || !newVehicle.make.trim() || !newVehicle.model.trim()) {
      setErrorMsg('Patente, marca y modelo son obligatorios.')
      return
    }

    setIsProcessing(true)
    setErrorMsg(null)
    setFeedbackMsg(null)

    try {
      await apiClient.post('/vehicles', {
        ...newVehicle,
        licensePlate: newVehicle.licensePlate.trim().toUpperCase(),
        year: newVehicle.year ? Number(newVehicle.year) : undefined,
        companyId: company._id,
      })

      setFeedbackMsg(`✅ Unidad ${newVehicle.licensePlate.toUpperCase()} creada y asignada a ${company.name}.`)
      setNewVehicle({ licensePlate: '', make: '', model: '', year: '', color: '' })
      setShowQuickCreate(false)
      await loadData()
      if (onUpdated) onUpdated()
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Error al registrar el nuevo vehículo.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 text-white w-full max-w-2xl rounded-3xl shadow-2xl border border-cyan-500/30 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-900 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-2xl text-cyan-400">
              🚗
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">
                  Flota de {company.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-400/30">
                  {assignedVehicles.length} {assignedVehicles.length === 1 ? 'Móvil' : 'Móviles'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Asignación, alta y desvinculación de vehículos para esta cuenta
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs">
          {feedbackMsg && (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs font-bold animate-in fade-in">
              {feedbackMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs font-semibold animate-in fade-in">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Sección 1: Asignar Vehículo Existente de la Flota */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-cyan-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span>🔗</span> Asignar Vehículo Existente de la Flota
              </span>
              <button
                type="button"
                onClick={() => setShowQuickCreate(!showQuickCreate)}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
              >
                <span>{showQuickCreate ? 'Ocultar Alta' : '➕ Dar de Alta Nuevo Vehículo'}</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
              <select
                value={selectedVehicleToAssign}
                onChange={(e) => setSelectedVehicleToAssign(e.target.value)}
                disabled={isProcessing || availableToAssign.length === 0}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-cyan-500 font-bold"
              >
                <option value="">
                  {availableToAssign.length === 0
                    ? '-- Todos los vehículos ya están asignados a esta empresa --'
                    : '-- Seleccionar vehículo para asignar --'}
                </option>
                {availableToAssign.map((v) => {
                  const currentCompName = v.company?.name || (typeof v.company === 'string' ? 'Otra empresa' : 'Sin asignar')
                  return (
                    <option key={v._id} value={v._id}>
                      🚗 {v.licensePlate} — {v.make} {v.model} (Actual: {currentCompName})
                    </option>
                  )
                })}
              </select>

              <button
                type="button"
                onClick={handleAssignVehicle}
                disabled={!selectedVehicleToAssign || isProcessing}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition disabled:opacity-50 shrink-0 shadow active:scale-95"
              >
                {isProcessing ? 'Asignando...' : 'Asignar a Empresa'}
              </button>
            </div>
          </div>

          {/* Formulario Desplegable: Alta Rápida de Nuevo Vehículo */}
          {showQuickCreate && (
            <form onSubmit={handleQuickCreate} className="bg-slate-950 p-4 rounded-2xl border-2 border-cyan-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span>✨</span> Alta de Nuevo Móvil directamente para {company.name}
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">Asignación Automática</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Patente *</label>
                  <input
                    type="text"
                    placeholder="ABCD-12"
                    value={newVehicle.licensePlate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, licensePlate: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold text-xs uppercase outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Marca *</label>
                  <input
                    type="text"
                    placeholder="Ej: Toyota"
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Modelo *</label>
                  <input
                    type="text"
                    placeholder="Ej: Hilux"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Año</label>
                  <input
                    type="number"
                    placeholder="2024"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Color</label>
                  <input
                    type="text"
                    placeholder="Blanco / Gris"
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow transition disabled:opacity-50"
                >
                  {isProcessing ? 'Guardando...' : 'Crear y Vincular a Esta Empresa'}
                </button>
              </div>
            </form>
          )}

          {/* Sección 2: Tabla de Vehículos Actualmente Asignados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-slate-300 text-xs font-bold uppercase tracking-wider">
                Unidades Vehiculares Asignadas ({assignedVehicles.length})
              </span>
              {isLoading && <span className="text-cyan-400 font-mono text-[11px]">Actualizando lista...</span>}
            </div>

            {assignedVehicles.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2 text-slate-400">
                <div className="text-3xl">📭</div>
                <p className="font-bold text-slate-300 text-sm">Sin vehículos asignados</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Esta empresa aún no cuenta con unidades vehiculares vinculadas. Usa el selector de arriba para asignarle vehículos existentes o crea uno nuevo.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#080c18] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Patente</th>
                      <th className="px-3.5 py-2.5">Marca / Modelo</th>
                      <th className="px-3.5 py-2.5">Conductor</th>
                      <th className="px-3.5 py-2.5">IMEI Satelital</th>
                      <th className="px-3.5 py-2.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {assignedVehicles.map((v) => (
                      <tr key={v._id} className="hover:bg-slate-900/50 transition">
                        <td className="px-3.5 py-3 font-mono font-bold text-cyan-300">
                          {v.licensePlate}
                        </td>
                        <td className="px-3.5 py-3 text-slate-200">
                          {v.make} {v.model}
                        </td>
                        <td className="px-3.5 py-3 text-slate-400">
                          {v.driver?.name || v.assignedDriver || 'Sin asignar'}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-slate-400 text-[11px]">
                          {v.deviceIMEI || 'Sin IMEI'}
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleUnassignVehicle(v._id, v.licensePlate)}
                            disabled={isProcessing}
                            className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/50 rounded-lg text-[11px] font-bold transition disabled:opacity-50"
                            title="Quitar de esta empresa"
                          >
                            ❌ Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  )
}
