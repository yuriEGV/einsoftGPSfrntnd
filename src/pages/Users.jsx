import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

const ROLES = [
  { value: 'admin', label: 'Administrador (Global)' },
  { value: 'fleet_manager', label: 'Gestor de Flota (Empresa)' },
  { value: 'independent', label: 'Particular / Plan Familiar' },
  { value: 'driver', label: 'Conductor' },
]

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700',
  fleet_manager: 'bg-blue-100 text-blue-700',
  independent: 'bg-indigo-100 text-indigo-700',
  driver: 'bg-emerald-100 text-emerald-700',
}

const ROLE_LABELS = {
  admin: '🔑 Administrador',
  fleet_manager: '🏢 Gestor de Flota',
  independent: '👤 Particular / Plan Familiar',
  driver: '🚗 Conductor',
}

export default function Users() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'independent',
    companyId: '',
  })

  // Edit modal state
  const [editUser, setEditUser] = useState(null) // null = closed
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'independent',
    status: 'active',
    newPassword: '',
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
        setForm({ name: '', email: '', password: '', role: 'independent', companyId: '' })
        queryClient.invalidateQueries('users')
        alert('✅ Usuario creado correctamente')
      },
      onError: (err) => {
        const msg = err.response?.data?.error || 'Falló la creación del usuario'
        alert(`❌ Error: ${msg}`)
      }
    },
  )

  const updateMutation = useMutation(
    ({ id, data }) => apiClient.put(`/users/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users')
        setEditUser(null)
        alert('✅ Usuario actualizado correctamente')
      },
      onError: (err) => {
        const msg = err.response?.data?.error || 'Error al actualizar usuario'
        alert(`❌ Error: ${msg}`)
      }
    }
  )

  const resetPasswordMutation = useMutation(
    ({ id, newPassword }) => apiClient.post(`/users/${id}/reset-password`, { newPassword }),
    {
      onSuccess: () => {
        setEditForm(prev => ({ ...prev, newPassword: '' }))
        alert('✅ Contraseña actualizada correctamente')
      },
      onError: (err) => {
        const msg = err.response?.data?.error || 'Error al cambiar contraseña'
        alert(`❌ Error: ${msg}`)
      }
    }
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

  const openEditModal = (u) => {
    setEditUser(u)
    setEditForm({
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status || 'active',
      newPassword: '',
    })
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    const payload = {
      name: editForm.name,
      email: editForm.email,
      role: editForm.role,
      status: editForm.status,
    }
    updateMutation.mutate({ id: editUser._id, data: payload })
  }

  const handleResetPassword = () => {
    if (!editForm.newPassword || editForm.newPassword.length < 6) {
      return alert('La nueva contraseña debe tener al menos 6 caracteres')
    }
    if (!window.confirm(`¿Confirmas cambiar la contraseña de ${editUser.name}?`)) return
    resetPasswordMutation.mutate({ id: editUser._id, newPassword: editForm.newPassword })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Usuarios</h1>
        <p className="text-sm text-gray-500">
          Total: <span className="font-bold">{users.length}</span> usuarios
        </p>
      </div>

      {/* CREATE FORM */}
      <div className="card">
        <h2 className="card-header">{isAdmin ? 'Registrar nuevo usuario en el sistema' : 'Crear usuario en esta empresa'}</h2>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 text-sm">
          {isAdmin && (
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">Empresa / Cliente</label>
              <select
                value={form.companyId}
                onChange={(e) => {
                  const companyId = e.target.value
                  if (companyId) {
                    setForm(prev => ({
                      ...prev,
                      companyId,
                      role: prev.role === 'independent' ? 'fleet_manager' : prev.role,
                    }))
                  } else {
                    setForm(prev => ({ ...prev, companyId: '', role: 'independent' }))
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all shadow-sm font-medium"
              >
                <option value="">🏠 Sin Empresa (Particular / Plan Familiar)</option>
                {companies.map(c => (
                  <option key={c._id} value={c._id}>🏢 {c.name}</option>
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
              onChange={(e) => {
                const role = e.target.value
                if (role === 'independent') {
                  setForm(prev => ({ ...prev, role, companyId: '' }))
                } else {
                  setForm(prev => ({ ...prev, role }))
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all shadow-sm font-medium"
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

      {/* USERS TABLE */}
      <div className="card">
        <h2 className="card-header">Usuarios del sistema</h2>
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Cargando...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No hay usuarios todavía.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">Nombre</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">Correo</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">Empresa</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">Rol</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right text-gray-700 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {u.company?.name || <span className="italic text-gray-400">Sin empresa</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-700'}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                        u.status === 'active' ? 'bg-green-100 text-green-700' :
                        u.status === 'suspended' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {u.status === 'active' ? '● Activo' : u.status === 'suspended' ? '● Suspendido' : u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-3 py-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-all"
                        >
                          ✏️ Editar
                        </button>
                        {u._id !== creator.id && (
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Estás seguro de eliminar a ${u.name}?`)) {
                                deleteMutation.mutate(u._id)
                              }
                            }}
                            disabled={deleteMutation.isLoading}
                            className="px-3 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-all disabled:opacity-50"
                          >
                            🗑️ Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-lg">Editar Usuario</h3>
                <p className="text-blue-200 text-xs mt-0.5">{editUser.email}</p>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="text-white/70 hover:text-white text-xl font-bold transition-colors"
              >✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Profile form */}
              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Nombre Completo</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Correo Electrónico</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-sm transition-all"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Rol</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-blue-500 outline-none text-sm bg-white"
                    >
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Estado</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-blue-500 outline-none text-sm bg-white"
                    >
                      <option value="active">● Activo</option>
                      <option value="suspended">● Suspendido</option>
                      <option value="inactive">○ Inactivo</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={updateMutation.isLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 shadow-lg"
                >
                  {updateMutation.isLoading ? 'Guardando...' : '✓ Guardar Cambios'}
                </button>
              </form>

              {/* Password Reset Section */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">🔒 Restablecer Contraseña</h4>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-orange-400 outline-none text-sm transition-all"
                    placeholder="Nueva contraseña (mín. 6 caracteres)"
                  />
                  <button
                    onClick={handleResetPassword}
                    disabled={resetPasswordMutation.isLoading}
                    className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {resetPasswordMutation.isLoading ? '...' : '🔑 Cambiar'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">⚠️ El usuario deberá iniciar sesión nuevamente con la nueva contraseña.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
