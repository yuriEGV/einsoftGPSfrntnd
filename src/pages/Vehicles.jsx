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
  const isAdmin = user.role === 'admin'

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

  const handleSelectVehicle = (vehicle) => {
    navigate(`/vehicles/${vehicle._id}`)
  }

  const handleVehicleSubmit = (e) => {
    e.preventDefault()
    if (isAdmin && !vehicleForm.companyId) {
      return alert('Debe seleccionar una empresa para el vehículo')
    }
    createVehicleMutation.mutate({
      ...vehicleForm,
      year: vehicleForm.year ? Number(vehicleForm.year) : undefined,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Vehículos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Total: <span className="font-bold text-gray-800">{vehicles.length}</span> unidades en flota
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg ${showAddForm
            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-900/20'
            }`}
        >
          {showAddForm ? '✕ Cancelar' : '➕ Registrar Nuevo Vehículo'}
        </button>
      </div>

      {/* Help Card */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4 items-start shadow-sm transition-all hover:shadow-md">
        <div className="bg-blue-500 text-white rounded-full p-2 text-xl">💡</div>
        <div className="space-y-2">
          <h3 className="text-blue-900 font-bold">Guía de Gestión de Flota</h3>
          <p className="text-blue-800 text-sm leading-relaxed">
            Bienvenido a tu panel de control. Para comenzar a monitorear:
            <br />
            1. **Registra el auto**: Usa el botón "Registrar Nuevo Vehículo" arriba.
            <br />
            2. **Vincula el chip**: Haz clic en el vehículo creado para asociar su IMEI y asignar un conductor.
            <br />
            3. **Gestiona**: Desde aquí puedes ver el historial y enviar comandos remotos de seguridad.
          </p>
        </div>
      </div>

      {
        showAddForm && (
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-emerald-50 px-6 py-3 border-b border-emerald-100">
              <h2 className="text-emerald-800 font-bold text-sm uppercase tracking-wider">Ingresar Datos del Nuevo Vehículo</h2>
            </div>
            <form onSubmit={handleVehicleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {isAdmin && (
                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-[10px] font-black text-emerald-700 uppercase mb-1">Empresa / Cliente</label>
                  <select
                    value={vehicleForm.companyId}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, companyId: e.target.value })}
                    className="w-full border-2 border-emerald-100 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none transition-all"
                    required
                  >
                    <option value="">Seleccionar Empresa...</option>
                    {companies.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-emerald-700 uppercase mb-1">Patente</label>
                <input
                  type="text"
                  value={vehicleForm.licensePlate}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value })}
                  className="w-full border-2 border-emerald-100 rounded-xl px-4 py-2 uppercase focus:border-emerald-500 outline-none transition-all"
                  placeholder="ABCD-12"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-emerald-700 uppercase mb-1">Marca</label>
                <input
                  type="text"
                  value={vehicleForm.make}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                  className="w-full border-2 border-emerald-100 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Ej: Chevrolet"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-emerald-700 uppercase mb-1">Modelo</label>
                <input
                  type="text"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                  className="w-full border-2 border-emerald-100 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Ej: Sail"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-emerald-700 uppercase mb-1">Año</label>
                <input
                  type="number"
                  value={vehicleForm.year}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                  className="w-full border-2 border-emerald-100 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none transition-all"
                  placeholder="2024"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={createVehicleMutation.isLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50"
                >
                  {createVehicleMutation.isLoading ? 'Guardando...' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        )
      }

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
        <VehicleList
          vehicles={vehicles}
          selectedVehicle={null}
          onSelectVehicle={handleSelectVehicle}
          isLoading={isLoading}
        />
      </div>
    </div >
  )
}

