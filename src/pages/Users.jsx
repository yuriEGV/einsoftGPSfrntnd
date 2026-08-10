import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

const ROLES = [
  { value: 'admin', label: 'Administrador (Global)' },
  { value: 'fleet_manager', label: 'Gestor de flota (Empresa)' },
  { value: 'independent', label: 'Particular / Plan Familiar (Sin Empresa)' },
  { value: 'driver', label: 'Conductor' },
  { value: 'viewer', label: 'Solo lectura' },
]

export default function Users() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'independent',
    companyId: '',
  })

  const { data: users = [], isLoading } = useQuery('users', async () => {
    const response = await apiClient.get('/users')
    return response.data
  })

  const { data: companies = [] } = useQuery('companies', async () => {
    const response = await apiClient.get('/companies')
    return response.data
  })

  const creator = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = creator.role === 'admin'

  const createMutation = useMutation(
    () => apiClient.post('/users', {
      ...form,
      companyId: form.role === 'independent' ? undefined : form.companyId,
    }),
    {
      onSuccess: () => {
        setForm({
          name: '',
          email: '',
          password: '',
          role: 'independent',
          companyId: '',
        })
        queryClient.invalidateQueries('users')
        alert('✅ Usuario creado correctamente')
      },
      onError: (err) => {
        const msg = err.response?.data?.error || 'Falló la creación del usuario'
        alert(`❌ Error: ${msg}`)
      }
    },
  )

  const deleteMutation = useMutation(
    (id) => apiClient.delete(`/users/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users')
      },
      onError: (err) => {
        const msg = err.response?.data?.error || 'Error al eliminar usuario'
        alert(`❌ No se pudo eliminar: ${msg}`)
      }
    },
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return
    if (isAdmin && form.role !== 'independent' && form.role !== 'admin' && !form.companyId) {
      return alert('Debe seleccionar una empresa para roles de gestión corporativa')
    }
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Usuarios</h1>
        <p className="text-sm text-gray-500">
          Total: <span className="font-bold">{users.length}</span> usuarios
        </p>
      </div>

      <div className="card">
        <h2 className="card-header">{isAdmin ? 'Registrar nuevo usuario en el sistema' : 'Crear usuario en esta empresa'}</h2>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 text-sm">
          {isAdmin && (
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">Empresa / Cliente</label>
              <select
                value={form.role === 'independent' ? '' : form.companyId}
                onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                disabled={form.role === 'independent'}
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm ${
                  form.role === 'independent' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                }`}
                required={form.role !== 'independent' && form.role !== 'admin'}
              >
                <option value="">{form.role === 'independent' ? 'Sin Empresa (Particular / Plan Familiar)' : 'Seleccionar Empresa...'}</option>
                {companies.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-gray-700 mb-1 font-semibold">Nombre Completo</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ej: Daniel Arp"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1 font-semibold">Correo Electrónico</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="correo@ejemplo.com"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1 font-semibold">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="8+ caracteres"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1 font-semibold">Rol Asignado</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all shadow-sm"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={createMutation.isLoading}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/10 transition-all disabled:opacity-50"
            >
              {createMutation.isLoading ? '...' : '🚀 Crear Usuario'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 className="card-header">Usuarios de la empresa</h2>
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Cargando...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No hay usuarios todavía.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Nombre</th>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Correo</th>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Rol</th>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Estado</th>
                <th className="px-4 py-2 text-right text-gray-700 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2 text-gray-600">{u.email}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'independent' ? 'bg-indigo-100 text-indigo-700' :
                      u.role === 'fleet_manager' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {u.role === 'admin' ? 'Administrador' :
                       u.role === 'fleet_manager' ? 'Gestor de Flota' :
                       u.role === 'independent' ? 'Particular / Plan Familiar' :
                       u.role === 'driver' ? 'Conductor' : u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Estás seguro de eliminar a ${u.name}?`)) {
                          deleteMutation.mutate(u._id)
                        }
                      }}
                      disabled={deleteMutation.isLoading}
                      className={`${deleteMutation.isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:text-red-900'
                        } text-red-600 text-xs font-medium`}
                    >
                      {deleteMutation.isLoading ? 'Eliminando...' : 'Eliminar'}
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

