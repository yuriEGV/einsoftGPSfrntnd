import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

export default function Companies() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  })

  const { data: companies = [], isLoading } = useQuery('companies', async () => {
    const response = await apiClient.get('/companies')
    return response.data
  })

  const createMutation = useMutation(
    () => apiClient.post('/companies', form),
    {
      onSuccess: () => {
        setForm({
          name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          country: '',
        })
        queryClient.invalidateQueries('companies')
      },
    },
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name) return
    createMutation.mutate()
  }

  return (
    <div className="space-y-6 text-slate-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase block mb-1">
            Administración Corporativa
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🏢</span> Clientes & Cuentas Corporativas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestión de organizaciones, clientes corporativos y entidades familiares registradas.
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 w-fit">
          TOTAL: <span className="text-cyan-400 font-bold">{companies.length}</span> CUENTAS
        </div>
      </div>

      {/* Corporate Guidance Banner */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-4 flex items-start gap-3.5 text-xs">
        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0 text-sm">
          💡
        </div>
        <div className="space-y-1">
          <p className="font-bold text-slate-200 text-sm">Estructura Organizacional de EINSoft GPS</p>
          <p className="text-slate-400 leading-relaxed">
            Un <strong>Cliente / Empresa</strong> representa la entidad matriz (ej. <em>Constructora del Mar S.A.</em> o <em>Familia Valenzuela</em>) bajo la cual se agrupan los vehículos telemáticos, balizas y nodos celulares. Los <strong>Usuarios</strong> son las cuentas individuales de acceso con roles asignados (administradores, auditores, operadores o conductores).
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="card">
        <h2 className="card-header">
          <span>Registrar Nuevo Cliente / Organización</span>
          <span className="text-[10px] font-mono text-slate-500 uppercase">Formulario de Alta</span>
        </h2>
        <form onSubmit={handleSubmit} className="p-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Razón Social / Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              placeholder="Ej: Transportes del Sur SpA"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Correo de Contacto</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              placeholder="contacto@empresa.com"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Teléfono Central</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              placeholder="+56 9 1234 5678"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Dirección Matriz</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              placeholder="Av. Providencia 1234"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Ciudad</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              placeholder="Santiago"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[11px]">País</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              placeholder="Chile"
            />
          </div>
          <div className="md:col-span-3 flex justify-end pt-2">
            <button
              type="submit"
              disabled={createMutation.isLoading}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {createMutation.isLoading ? 'Registrando...' : 'Registrar Cuenta'}
            </button>
          </div>
        </form>
      </div>

      {/* Directory Table Card */}
      <div className="card">
        <h2 className="card-header">
          <span>Directorio de Cuentas Activas</span>
          <span className="text-xs font-mono text-slate-500">{companies.length} Entidades</span>
        </h2>
        {isLoading ? (
          <div className="p-6 text-xs text-slate-500 font-mono">Cargando directorio...</div>
        ) : companies.length === 0 ? (
          <div className="p-6 text-xs text-slate-500 font-mono">No hay empresas registradas actualmente.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#080c18] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Nombre / Razón Social</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Ubicación</th>
                  <th className="px-4 py-3 text-right">Estado Operativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {companies.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-100">
                      {c.name}
                      <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                        {c.vehicleCount || 0} unidades asignadas
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {c.email || 'Sin correo'}<br />
                      <span className="text-[10px] text-slate-500 font-mono">{c.phone || 'Sin teléfono'}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {c.address || 'Sin dirección'}<br />
                      <span className="text-[10px] text-slate-500 font-mono">{c.city || ''} {c.country || ''}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {c.isActive ? (
                        <span className="px-2 py-0.5 text-[9px] font-bold font-mono rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 uppercase tracking-wider">
                          Activa
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-bold font-mono rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider">
                          Inactiva
                        </span>
                      )}
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
