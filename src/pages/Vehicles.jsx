import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/api'
import VehicleList from '../components/VehicleList'

export default function Vehicles() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({
    licensePlate: '',
    make: '',
    model: '',
    year: '',
    color: '',
    companyId: '',
  })

  const { data: vehicles = [], isLoading } = useQuery('vehicles', async () => {
    const response = await apiClient.get('/vehicles')
    return response.data
  })

  const { data: companies = [] } = useQuery('companies', async () => {
    const response = await apiClient.get('/companies')
    return response.data
  })

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'fleet_manager'

  const createVehicleMutation = useMutation(
    (payload) => apiClient.post('/vehicles', payload),
    {
      onSuccess: () => {
        setVehicleForm({ licensePlate: '', make: '', model: '', year: '', color: '', companyId: '' })
        setShowAddForm(false)
        queryClient.invalidateQueries('vehicles')
      },
    },
  )

  const deleteVehicleMutation = useMutation(
    (vehicleId) => apiClient.delete(`/vehicles/${vehicleId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('vehicles')
      },
    },
  )

  const handleSelectVehicle = (vehicle) => {
    navigate(`/vehicles/${vehicle._id}`)
  }

  const handleVehicleSubmit = (e) => {
    e.preventDefault()
    createVehicleMutation.mutate({
      ...vehicleForm,
      companyId: vehicleForm.companyId || undefined,
      year: vehicleForm.year ? Number(vehicleForm.year) : undefined,
    })
  }

  return (
    <div className="space-y-6 text-slate-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase block mb-1">
            Gestión Telemática de Flota
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🚗</span> Parque Automotriz & Unidades
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoreo en vivo de estado, telemetría inercial y control de unidades registradas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            TOTAL: <span className="text-cyan-400 font-bold">{vehicles.length}</span> MÓVILES
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              showAddForm
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border-slate-700'
            }`}
          >
            {showAddForm ? '✕ Cancelar Formulario' : '+ Alta de Unidad'}
          </button>
        </div>
      </div>

      {/* Operational Protocol Card */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-4 flex items-start gap-3.5 text-xs">
        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0 text-sm">
          🛡️
        </div>
        <div className="space-y-1">
          <p className="font-bold text-slate-200 text-sm">Protocolo de Operación Telemática</p>
          <p className="text-slate-400 leading-relaxed">
            1. **Registro**: Ingrese los datos de la patente y modelo. <br />
            2. **Vinculación Hardware**: Asigne el código IMEI del equipo GPS y el chip SIM desde el detalle del vehículo o la pestaña Hardware. <br />
            3. **Telemetría Activa**: Acceda a los comandos remotos (inmovilización de motor, reporte inmediato de posición y odómetro en ruta).
          </p>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card animate-in fade-in duration-200">
          <h2 className="card-header">
            <span>Alta de Nuevo Móvil en la Plataforma</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Ficha Técnica</span>
          </h2>
          <form onSubmit={handleVehicleSubmit} className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 text-xs">
            {isAdmin && (
              <div className="md:col-span-2 lg:col-span-1 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase">Empresa / Cuenta</label>
                <select
                  value={vehicleForm.companyId}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, companyId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none"
                  required
                >
                  <option value="">Seleccionar Empresa...</option>
                  {companies.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">Patente *</label>
              <input
                type="text"
                value={vehicleForm.licensePlate}
                onChange={(e) => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 uppercase focus:border-cyan-500 outline-none font-mono font-bold"
                placeholder="ABCD-12"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">Marca *</label>
              <input
                type="text"
                value={vehicleForm.make}
                onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none"
                placeholder="Ej: Chevrolet"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">Modelo *</label>
              <input
                type="text"
                value={vehicleForm.model}
                onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none"
                placeholder="Ej: D-Max"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">Año</label>
              <input
                type="number"
                value={vehicleForm.year}
                onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none font-mono"
                placeholder="2025"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={createVehicleMutation.isLoading}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-xl font-bold uppercase text-xs tracking-wider transition-all disabled:opacity-50"
              >
                {createVehicleMutation.isLoading ? 'Guardando...' : 'Guardar Móvil'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vehicle List Container */}
      <div className="rounded-2xl border border-slate-800 bg-[#0a0f1d] p-3 shadow-xl">
        <VehicleList
          vehicles={vehicles}
          selectedVehicle={null}
          onSelectVehicle={handleSelectVehicle}
          onDeleteVehicle={(id) => deleteVehicleMutation.mutate(id)}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
