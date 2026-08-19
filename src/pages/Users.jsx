import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'
import { usePermissions } from '../hooks/usePermissions'

const ROLES = [
  { value: 'superadmin', label: '🔴 Superadministrador (Control Total)' },
  { value: 'admin', label: '🔴 Administrador (Organización/Flota)' },
  { value: 'operator', label: '🔴 Operador GPS (Centro de Monitoreo)' },
  { value: 'supervisor', label: '🔴 Supervisor (Supervisión y Análisis)' },
  { value: 'driver', label: '🟠 Conductor (Vehículo asignado)' },
  { value: 'mobile_gps_user', label: '🟢 Usuario Celular GPS (Móvil en Terreno / SOS)' },
  { value: 'client', label: '🟠 Cliente / Consulta (Solo lectura autorizada)' },
  { value: 'auditor', label: '🟡 Auditor (Solo lectura global)' },
]

const ROLE_COLORS = {
  superadmin: 'bg-red-100 text-red-700 border-red-300',
  admin: 'bg-purple-100 text-purple-700 border-purple-300',
  operator: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  supervisor: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  driver: 'bg-amber-100 text-amber-700 border-amber-300',
  mobile_gps_user: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  client: 'bg-blue-100 text-blue-700 border-blue-300',
  auditor: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  // Legacy
  fleet_manager: 'bg-purple-100 text-purple-700 border-purple-300',
  independent: 'bg-emerald-100 text-emerald-700 border-emerald-300',
}

const ROLE_LABELS = {
  superadmin: '🔴 Superadministrador',
  admin: '🔴 Administrador',
  operator: '🔴 Operador GPS',
  supervisor: '🔴 Supervisor',
  driver: '🚗 Conductor',
  mobile_gps_user: '📱 Celular GPS',
  client: '👁️ Cliente Consulta',
  auditor: '📋 Auditor',
  // Legacy
  fleet_manager: '🔴 Administrador',
  independent: '📱 Celular GPS',
}

export default function Users() {
  const queryClient = useQueryClient()
  const { role: myRole, isSuperAdmin, isAdmin, isReadOnly, canWrite } = usePermissions()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'mobile_gps_user',
    companyId: '',
    phone: '',
    imei: '',
  })

  // Edit modal state
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'mobile_gps_user',
    status: 'active',
    phone: '',
    imei: '',
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

  // Filter available roles for creation based on creator's role
  const availableRoles = ROLES.filter(r => {
    if (r.value === 'superadmin') return isSuperAdmin
    return true
  })

  const createMutation = useMutation(
    () => apiClient.post('/users', {
      ...form,
      companyId: form.role === 'mobile_gps_user' && !form.companyId ? undefined : form.companyId,
    }),
    {
      onSuccess: () => {
        setForm({ name: '', email: '', password: '', role: 'mobile_gps_user', companyId: '', phone: '', imei: '' })
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
    if (isAdmin && !['mobile_gps_user', 'superadmin'].includes(form.role) && !form.companyId) {
      return alert('Debe seleccionar una empresa para roles corporativos')
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
      phone: u.phone || '',
      imei: u.imei || '',
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
      phone: editForm.phone,
      imei: editForm.imei,
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Usuarios</h1>
          <p className="text-xs text-gray-500 mt-1">Control de acceso y perfiles de EINSoft GPS</p>
        </div>
        <p className="text-sm text-gray-500">
          Total: <span className="font-bold">{users.length}</span> usuarios
        </p>
      </div>

      {/* Auditor Read-only banner */}
      {isReadOnly && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 flex items-center gap-3 text-yellow-800 text-sm">
          <span className="text-xl">🟡</span>
          <div>
            <span className="font-bold">Modo Auditor / Consulta:</span> Tienes permisos de solo lectura. No puedes crear, modificar ni eliminar usuarios.
          </div>
        </div>
      )}

      {/* CREATE FORM - Only if canWrite */}
      {canWrite && (
        <div className="card bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-slate-900 text-white px-6 py-3 font-bold text-sm">
            {isSuperAdmin ? '⚡ Registrar nuevo usuario en la plataforma' : '⚡ Crear usuario en esta organización'}
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-sm">
            {isAdmin && (
              <div>
                <label className="block text-gray-700 mb-1 font-semibold text-xs">Organización / Empresa</label>
                <select
                  value={form.companyId}
                  onChange={(e) => setForm(prev => ({ ...prev, companyId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all shadow-sm font-medium"
                >
                  <option value="">🏢 Sin Empresa Asignada</option>
                  {companies.map(c => (
                    <option key={c._id} value={c._id}>🏢 {c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-gray-700 mb-1 font-semibold text-xs">Nombre Completo *</label>
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
              <label className="block text-gray-700 mb-1 font-semibold text-xs">Correo Electrónico *</label>
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
              <label className="block text-gray-700 mb-1 font-semibold text-xs">Contraseña *</label>
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
              <label className="block text-gray-700 mb-1 font-semibold text-xs">Rol Asignado *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all shadow-sm font-medium"
              >
                {availableRoles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-semibold text-xs">Teléfono Móvil (Opcional)</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="+56 9 1234 5678"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-semibold text-xs">📱 IMEI / ID GPS (Opcional)</label>
              <input
                type="text"
                value={form.imei}
                onChange={(e) => setForm({ ...form, imei: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                placeholder="Ej: 866140042278017"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={createMutation.isLoading}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/10 transition-all disabled:opacity-50"
              >
                {createMutation.isLoading ? 'Creando...' : '🚀 Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* USERS TABLE */}
      <div className="card bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-gray-900 text-base">Directorio de Usuarios</h2>
          <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-semibold">
            {users.length} Registros
          </span>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No hay usuarios registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">Nombre</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">Correo</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">Empresa</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">Rol</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">Teléfono / IMEI</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">Estado</th>
                  {canWrite && <th className="px-4 py-3 text-right text-gray-700 font-semibold">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {u.company?.name || <span className="italic text-gray-400">Sin empresa</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-700'}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.phone && <div>📞 {u.phone}</div>}
                      {u.imei && <div className="font-mono text-[10px] text-slate-400">IMEI: {u.imei}</div>}
                      {!u.phone && !u.imei && <span className="text-gray-300">--</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                        u.status === 'active' ? 'bg-green-100 text-green-700' :
                        u.status === 'suspended' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {u.status === 'active' ? '● Activo' : u.status === 'suspended' ? '● Suspendido' : u.status}
                      </span>
                    </td>
                    {canWrite && (
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
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editUser && canWrite && (
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
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Teléfono</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-sm transition-all"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">📱 IMEI / ID Dispositivo GPS</label>
                  <input
                    type="text"
                    value={editForm.imei}
                    onChange={(e) => setEditForm({ ...editForm, imei: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-sm transition-all font-mono"
                    placeholder="Ej: 866140042278017 o ID celular"
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
                      {availableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

