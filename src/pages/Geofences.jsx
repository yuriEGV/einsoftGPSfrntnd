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
      alert('Complete el nombre y las coordenadas de la geocerca.')
      return
    }
    if (isNaN(parseFloat(form.latitude)) || isNaN(parseFloat(form.longitude))) {
      alert('Ingrese coordenadas numéricas válidas (ej: -33.4489, -70.6693)')
      return
    }
    createMutation.mutate()
  }

  return (
    <div className="space-y-6 text-slate-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase block mb-1">
            Seguridad Perimetral & Geocercas
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🗺️</span> Perímetros Virtuales & Control de Zona
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Definición de perímetros satelitales con alertas automáticas de entrada, salida y desvío de trayecto.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            TOTAL: <span className="text-cyan-400 font-bold">{geofences.length}</span> ZONAS
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              showForm
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border-slate-700'
            }`}
          >
            {showForm ? '✕ Cancelar' : '+ Nueva Geocerca'}
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-4 flex items-start gap-3.5 text-xs">
        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0 text-sm">
          📍
        </div>
        <div className="space-y-1">
          <p className="font-bold text-slate-200 text-sm">Operación de Perímetros de Seguridad</p>
          <p className="text-slate-400 leading-relaxed">
            Las geocercas supervisan de forma desatendida el ingreso y egreso de unidades móviles o personal en áreas sensibles (bases operativas, depósitos, colegios o domicilios). Cualquier transgresión dispara una notificación prioritaria a la consola SOC y al Bot de Telegram.
          </p>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card animate-in fade-in duration-200">
          <h2 className="card-header">
            <span>Parametrizar Nueva Geocerca</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Radio Circular</span>
          </h2>
          <form onSubmit={handleSubmit} className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="lg:col-span-2 space-y-1">
              <label className="block text-slate-400 font-semibold uppercase text-[11px]">Nombre de la Zona *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Base Central / Depósito Quilicura"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none transition"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-400 font-semibold uppercase text-[11px]">Radio de Cobertura (Metros) *</label>
              <input
                type="number"
                value={form.radius}
                onChange={(e) => setForm({ ...form, radius: e.target.value })}
                min="50"
                max="50000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-400 font-semibold uppercase text-[11px]">Latitud Centro *</label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                placeholder="-33.4489"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-400 font-semibold uppercase text-[11px]">Longitud Centro *</label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                placeholder="-70.6693"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-400 font-semibold uppercase text-[11px]">Descripción / Notas</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Observaciones de seguridad..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none transition"
              />
            </div>
            <div className="col-span-full flex justify-end pt-2">
              <button
                type="submit"
                disabled={createMutation.isLoading}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {createMutation.isLoading ? 'Registrando...' : 'Confirmar y Activar Geocerca'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Geocercas */}
      <div className="card">
        <h2 className="card-header">
          <span>Perímetros Activos en el Sistema</span>
          <span className="text-xs font-mono text-slate-500">{geofences.length} Zonas</span>
        </h2>
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">Cargando base perimetral...</div>
        ) : geofences.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">No hay geocercas configuradas actualmente.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#080c18] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Coordenadas Centro</th>
                  <th className="px-4 py-3">Radio</th>
                  <th className="px-4 py-3">Unidades</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {geofences.map((g) => (
                  <tr key={g._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-100">{g.name}</td>
                    <td className="px-4 py-3.5 text-slate-400">{g.description || '-'}</td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-cyan-400/90">
                      {g.geometry?.coordinates
                        ? `${g.geometry.coordinates[1].toFixed(4)}, ${g.geometry.coordinates[0].toFixed(4)}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-300">{g.radius ? `${g.radius} m` : '-'}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded font-mono text-[10px] font-bold">
                        {g.assignedVehicles?.length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${g.active !== false ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50' : 'bg-slate-800 text-slate-500'}`}>
                        {g.active !== false ? '● Activa' : '○ Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar la geocerca "${g.name}"? Esta acción no se puede deshacer.`)) {
                            deleteMutation.mutate(g._id)
                          }
                        }}
                        disabled={deleteMutation.isLoading}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-900/50 rounded-lg text-[11px] transition-all disabled:opacity-50"
                      >
                        Eliminar
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
  )
}
