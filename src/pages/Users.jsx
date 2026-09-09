import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'
import { usePermissions } from '../hooks/usePermissions'

const ROLES = [
  { value: 'superadmin', label: 'Superadministrador (Control Total)' },
  { value: 'admin', label: 'Administrador (Organización/Flota)' },
  { value: 'operator', label: 'Operador SOC (Centro de Monitoreo)' },
  { value: 'supervisor', label: 'Supervisor (Supervisión y Análisis)' },
  { value: 'driver', label: 'Conductor (Vehículo asignado)' },
  { value: 'mobile_gps_user', label: 'Usuario Celular GPS (Nodo Móvil)' },
  { value: 'client', label: 'Cliente Consulta (Solo lectura)' },
  { value: 'auditor', label: 'Auditor de Seguridad (Solo lectura global)' },
]

const ROLE_COLORS = {
  superadmin: 'bg-slate-800 text-slate-200 border-slate-700',
  admin: 'bg-slate-800 text-slate-200 border-slate-700',
  operator: 'bg-cyan-950 text-cyan-300 border-cyan-800/60',
  supervisor: 'bg-slate-800 text-slate-200 border-slate-700',
  driver: 'bg-amber-950 text-amber-300 border-amber-800/60',
  mobile_gps_user: 'bg-emerald-950 text-emerald-300 border-emerald-800/60',
  client: 'bg-slate-900 text-slate-400 border-slate-800',
  auditor: 'bg-slate-900 text-slate-400 border-slate-800',
  fleet_manager: 'bg-slate-800 text-slate-200 border-slate-700',
  independent: 'bg-emerald-950 text-emerald-300 border-emerald-800/60',
}

const ROLE_LABELS = {
  superadmin: 'Superadministrador',
  admin: 'Administrador',
  operator: 'Operador SOC',
  supervisor: 'Supervisor',
  driver: 'Conductor',
  mobile_gps_user: 'Celular GPS',
  client: 'Cliente Consulta',
  auditor: 'Auditor',
  fleet_manager: 'Administrador',
  independent: 'Celular GPS',
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
    companyId: '',
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
        alert('Usuario creado correctamente.')
      },
      onError: (err) => {
        alert(err.response?.data?.error || 'Error al crear usuario')
      }
    },
  )

  const updateMutation = useMutation(
    ({ id, payload }) => apiClient.put(`/users/${id}`, payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users')
        setEditUser(null)
        alert('Usuario actualizado con éxito.')
      },
      onError: (err) => {
        alert(err.response?.data?.error || 'Error al actualizar usuario')
      }
    }
  )

  const resetPasswordMutation = useMutation(
    ({ id, newPassword }) => apiClient.post(`/users/${id}/reset-password`, { newPassword }),
    {
      onSuccess: () => {
        alert('Contraseña restablecida correctamente.')
        setEditForm(prev => ({ ...prev, newPassword: '' }))
      },
      onError: (err) => {
        alert(err.response?.data?.error || 'Error al restablecer contraseña')
      }
    }
  )

  const deleteMutation = useMutation(
    (id) => apiClient.delete(`/users/${id}`),
    {
      onSuccess: () => queryClient.invalidateQueries('users'),
      onError: (err) => alert(err.response?.data?.error || 'Error al eliminar usuario')
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return
    createMutation.mutate()
  }

  const openEditModal = (u) => {
    setEditUser(u)
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'client',
      companyId: u.company?._id || u.company || '',
      status: u.status || 'active',
      phone: u.phone || '',
      imei: u.imei || '',
      newPassword: '',
    })
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate({
      id: editUser._id,
      payload: {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        companyId: editForm.role === 'mobile_gps_user' && !editForm.companyId ? null : editForm.companyId || null,
        status: editForm.status,
        phone: editForm.phone,
        imei: editForm.imei,
      }
    })
  }

  const handleResetPassword = () => {
    if (!editForm.newPassword || editForm.newPassword.length < 6) {
      return alert('La nueva contraseña debe tener al menos 6 caracteres.')
    }
    if (!window.confirm(`¿Confirmas cambiar la contraseña de ${editUser.name}?`)) return
    resetPasswordMutation.mutate({ id: editUser._id, newPassword: editForm.newPassword })
  }

  return (
    <div className="space-y-6 text-slate-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase block mb-1">
            Control de Accesos & Seguridad RBAC
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>👥</span> Cuentas de Usuarios & Permisos
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Administración de credenciales, roles operativos y asignación a organizaciones clientes.
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
          TOTAL: <span className="text-cyan-400 font-bold">{users.length}</span> USUARIOS
        </div>
      </div>

      {/* Distinction Banner */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-4 flex items-start gap-3.5 text-xs">
        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0 text-sm">
          👤
        </div>
        <div className="space-y-1">
          <p className="font-bold text-slate-200 text-sm">Diferenciación de Entidades</p>
          <p className="text-slate-400 leading-relaxed">
            • <strong>Cliente / Empresa:</strong> Cuenta matriz titular (ej. <em>Transportes Gómez</em>). <br />
            • <strong>Usuario:</strong> Persona autorizada que accede mediante credenciales y rol (<em>Superadministrador</em>, <em>Administrador</em>, <em>Operador SOC</em>, <em>Conductor</em> o <em>Auditor</em>).
          </p>
        </div>
      </div>

      {/* Auditor Read-only banner */}
      {isReadOnly && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Modo Auditor Activo: Acceso de solo lectura global. Acciones de creación y modificación restringidas.</span>
        </div>
      )}

      {/* CREATE FORM - Only if canWrite */}
      {canWrite && (
        <div className="card">
          <h2 className="card-header">
            <span>{isSuperAdmin ? 'Alta de Nuevo Usuario Global' : 'Crear Usuario en la Organización'}</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Formulario RBAC</span>
          </h2>
          <form onSubmit={handleSubmit} className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
            {companies.length > 0 && (
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase">Organización / Empresa</label>
                <select
                  value={form.companyId}
                  onChange={(e) => setForm(prev => ({ ...prev, companyId: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none"
                >
                  <option value="">Plan Familiar / Particular (Sin Empresa)</option>
                  {companies.map(c => (
                    <option key={c._id} value={c._id}>🏢 {c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">Nombre Completo *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none"
                placeholder="Ej: Daniel Arp"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">Correo Electrónico *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none"
                placeholder="operador@einsoftgps.com"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">Contraseña *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">Rol Asignado *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none"
              >
                {availableRoles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">Teléfono (Opcional)</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none"
                placeholder="+56 9 1234 5678"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">IMEI / ID Celular (Opcional)</label>
              <input
                type="text"
                value={form.imei}
                onChange={(e) => setForm({ ...form, imei: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none font-mono"
                placeholder="Para nodo de terreno"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={createMutation.isLoading}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-xl font-bold uppercase text-xs tracking-wider transition-all disabled:opacity-50"
              >
                {createMutation.isLoading ? 'Creando...' : 'Registrar Usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* USER LIST */}
      <div className="card">
        <h2 className="card-header">
          <span>Usuarios con Acceso a la Plataforma</span>
          <span className="text-xs font-mono text-slate-500">{users.length} Cuentas</span>
        </h2>
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">Cargando cuentas...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">No hay usuarios registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#080c18] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Organización</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Contacto / IMEI</th>
                  <th className="px-4 py-3">Estado</th>
                  {canWrite && <th className="px-4 py-3 text-right">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-100">{u.name}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono">{u.email}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {u.company?.name || <span className="italic text-slate-600">Particular</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-wider ${ROLE_COLORS[u.role] || 'bg-slate-800 text-slate-400'}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {u.phone && <div>{u.phone}</div>}
                      {u.imei && <div className="text-slate-500 text-[10px]">IMEI: {u.imei}</div>}
                      {!u.phone && !u.imei && <span className="text-slate-600">--</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold uppercase tracking-wider ${
                        u.status === 'active' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50' :
                        u.status === 'suspended' ? 'bg-red-950 text-red-300 border border-red-800/60' :
                        'bg-slate-900 text-slate-500'
                      }`}>
                        {u.status === 'active' ? '● Activo' : u.status === 'suspended' ? '● Suspendido' : u.status}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg transition"
                          >
                            Editar
                          </button>
                          {u._id !== creator.id && (
                            <button
                              onClick={() => {
                                if (window.confirm(`¿Eliminar al usuario ${u.name}?`)) {
                                  deleteMutation.mutate(u._id)
                                }
                              }}
                              disabled={deleteMutation.isLoading}
                              className="px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-900/50 rounded-lg transition disabled:opacity-50"
                            >
                              ✕
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-xs text-slate-200">
            <div className="bg-[#080c18] border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm">Editar Cuenta de Usuario</h3>
                <p className="text-slate-400 text-[11px] font-mono mt-0.5">{editUser.email}</p>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="text-slate-400 hover:text-white text-base font-bold transition-colors"
              >✕</button>
            </div>

            <div className="p-5 space-y-4">
              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400">Nombre Completo</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:border-cyan-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400">Correo Electrónico</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:border-cyan-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400">Teléfono</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:border-cyan-500 outline-none"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400">IMEI / ID Móvil GPS</label>
                  <input
                    type="text"
                    value={editForm.imei}
                    onChange={(e) => setEditForm({ ...editForm, imei: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs font-mono focus:border-cyan-500 outline-none"
                    placeholder="Código IMEI"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400">Organización / Empresa</label>
                  <select
                    value={editForm.companyId}
                    onChange={(e) => setEditForm({ ...editForm, companyId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:border-cyan-500 outline-none"
                  >
                    <option value="">Plan Familiar / Particular (Sin Empresa)</option>
                    {companies.map(c => (
                      <option key={c._id} value={c._id}>🏢 {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase text-slate-400">Rol</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:border-cyan-500 outline-none"
                    >
                      {availableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase text-slate-400">Estado</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:border-cyan-500 outline-none"
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
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 rounded-xl font-bold uppercase text-xs tracking-wider transition disabled:opacity-50"
                >
                  {updateMutation.isLoading ? 'Guardando...' : 'Guardar Modificaciones'}
                </button>
              </form>

              {/* Password Reset */}
              <div className="border-t border-slate-800/80 pt-3 space-y-2">
                <span className="block text-[10px] font-mono uppercase text-slate-400">Restablecer Contraseña</span>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:border-cyan-500 outline-none"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    onClick={handleResetPassword}
                    disabled={resetPasswordMutation.isLoading}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl font-bold text-xs transition disabled:opacity-50"
                  >
                    {resetPasswordMutation.isLoading ? '...' : 'Cambiar'}
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
