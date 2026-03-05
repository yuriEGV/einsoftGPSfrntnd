import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

export default function Geofences() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    description: '',
    radius: 500,
    latitude: '',
    longitude: '',
  })
  const [showForm, setShowForm] = useState(false)

  const { data: geofences = [], isLoading } = useQuery('geofences', async () => {
    const response = await apiClient.get('/geofences')
    return response.data
  })

  const createMutation = useMutation(
    () => apiClient.post('/geofences', {
      name: form.name,
      description: form.description,
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(form.longitude), parseFloat(form.latitude)],
      },
      radius: Number(form.radius),
      active: true,
    }),
    {
      onSuccess: () => {
        setForm({ name: '', description: '', radius: 500, latitude: '', longitude: '' })
        setShowForm(false)
        queryClient.invalidateQueries('geofences')
      },
    },
  )

  const deleteMutation = useMutation(
    (id) => apiClient.delete(`/geofences/${id}`),
    {
      onSuccess: () => queryClient.invalidateQueries('geofences'),
    },
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.latitude || !form.longitude) {
      alert('Completa el nombre y las coordenadas de la geocerca.')
      return
    }
    if (isNaN(parseFloat(form.latitude)) || isNaN(parseFloat(form.longitude))) {
      alert('Ingresa coordenadas numéricas válidas (ej: -33.4489, -70.6693)')
      return
    }
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Geocercas</h1>
          <p className="text-sm text-gray-500 mt-1">Total: {geofences.length} zonas configuradas</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg ${showForm
            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-900/20'
            }`}
        >
          {showForm ? '✕ Cancelar' : '➕ Nueva Geocerca'}
        </button>
      </div>

      {/* Help Card */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex gap-4 items-start shadow-sm">
        <div className="bg-emerald-500 text-white rounded-full p-2 text-xl">🛰️</div>
        <div className="space-y-1">
          <h3 className="text-emerald-900 font-bold">¿Cómo funcionan las Geocercas?</h3>
          <p className="text-emerald-800 text-sm leading-relaxed">
            Perímetros virtuales que activan alertas cuando un vehículo entra o sale de la zona.
            Define un nombre, las coordenadas GPS del centro, y un radio en metros.
            Puedes obtener coordenadas en <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="underline font-bold">Google Maps</a> haciendo clic derecho sobre el punto.
          </p>
        </div>
      </div>

      {/* ===== FORMULARIO DE CREACIÓN ===== */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-50 px-6 py-3 border-b border-emerald-100">
            <h2 className="text-emerald-800 font-bold text-sm uppercase tracking-wider">Nueva Geocerca</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-black text-emerald-700 uppercase mb-1">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Zona de Depósito, Bodega Norte..."
                required
                className="w-full border-2 border-emerald-100 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-emerald-700 uppercase mb-1">Radio (metros) *</label>
              <input
                type="number"
                value={form.radius}
                onChange={(e) => setForm({ ...form, radius: e.target.value })}
                min="50"
                max="50000"
                className="w-full border-2 border-emerald-100 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-emerald-700 uppercase mb-1">Latitud *</label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                placeholder="-33.4489"
                required
                className="w-full border-2 border-emerald-100 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-emerald-700 uppercase mb-1">Longitud *</label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                placeholder="-70.6693"
                required
                className="w-full border-2 border-emerald-100 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-emerald-700 uppercase mb-1">Descripción</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Información adicional..."
                className="w-full border-2 border-emerald-100 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={createMutation.isLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50"
              >
                {createMutation.isLoading ? 'Creando...' : '✓ Crear Geocerca'}
              </button>
            </div>
            {createMutation.isError && (
              <p className="col-span-full text-red-600 text-xs">
                Error: {createMutation.error?.response?.data?.error || 'No se pudo crear'}
              </p>
            )}
          </form>
        </div>
      )}

      {/* ===== LISTA DE GEOCERCAS ===== */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Zonas Configuradas</h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Cargando geocercas...</div>
        ) : geofences.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-4xl mb-3">🛰️</p>
            <p className="text-gray-500 text-sm">Aún no hay geocercas. Crea la primera arriba.</p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-semibold text-xs uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-gray-600 font-semibold text-xs uppercase">Descripción</th>
                <th className="px-4 py-3 text-left text-gray-600 font-semibold text-xs uppercase">Coordenadas</th>
                <th className="px-4 py-3 text-left text-gray-600 font-semibold text-xs uppercase">Radio</th>
                <th className="px-4 py-3 text-left text-gray-600 font-semibold text-xs uppercase">Vehículos</th>
                <th className="px-4 py-3 text-left text-gray-600 font-semibold text-xs uppercase">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {geofences.map((g) => (
                <tr key={g._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-900">{g.name}</td>
                  <td className="px-4 py-3 text-gray-600">{g.description || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {g.geometry?.coordinates
                      ? `${g.geometry.coordinates[1].toFixed(4)}, ${g.geometry.coordinates[0].toFixed(4)}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3">{g.radius ? `${g.radius} m` : '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                      {g.assignedVehicles?.length || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${g.active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {g.active !== false ? '● Activa' : '○ Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Eliminar la geocerca "${g.name}"? Esta acción no se puede deshacer.`)) {
                          deleteMutation.mutate(g._id)
                        }
                      }}
                      disabled={deleteMutation.isLoading}
                      className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold border border-red-200 transition-all disabled:opacity-50"
                    >
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
