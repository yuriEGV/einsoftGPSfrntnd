import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'fleet_manager', label: 'Gestor de flota' },
  { value: 'driver', label: 'Conductor' },
  { value: 'viewer', label: 'Solo lectura' },
]

export default function Users() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'fleet_manager',
  })

  const { data: users = [], isLoading } = useQuery('users', async () => {
    const response = await apiClient.get('/users')
    return response.data
  })

  const createMutation = useMutation(
    () => apiClient.post('/users', form),
    {
      onSuccess: () => {
        setForm({
          name: '',
          email: '',
          password: '',
          role: 'fleet_manager',
        })
        queryClient.invalidateQueries('users')
      },
    },
  )

  const deleteMutation = useMutation(
    (id) => apiClient.delete(`/users/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users')
      },
    },
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-sm text-gray-500">
          Total: {users.length} usuarios
        </p>
      </div>

      <div className="card">
        <h2 className="card-header">Crear usuario en esta empresa</h2>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Correo</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              Crear usuario
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
                  <td className="px-4 py-2 capitalize">{u.role}</td>
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

