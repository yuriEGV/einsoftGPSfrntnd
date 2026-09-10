import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/api'
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits'

export default function Settings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isPaid } = useSubscriptionLimits()
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [activeTab, setActiveTab] = useState('account') // 'account' | 'telegram' | 'hardware'

  const { data: profile } = useQuery('profile', async () => {
    const response = await apiClient.get('/users/profile')
    return response.data
  }, {
    onSuccess: (data) => {
      setProfileForm({ name: data.name || '', phone: data.phone || '' })
    },
  })

  const { data: vehicles } = useQuery('vehicles', async () => {
    const response = await apiClient.get('/vehicles')
    return response.data
  })

  const { data: drivers = [] } = useQuery('drivers', async () => {
    const response = await apiClient.get('/users/drivers')
    return response.data
  })

  const updateProfileMutation = useMutation(
    (payload) => apiClient.put('/users/profile', payload),
    {
      onSuccess: () => {
        alert('Perfil corporativo actualizado correctamente')
        queryClient.invalidateQueries('profile')
      },
    },
  )

  const changePasswordMutation = useMutation(
    (payload) => apiClient.post('/users/change-password', payload),
    {
      onSuccess: () => {
        alert('Contraseña actualizada con éxito')
        setPasswordForm({ currentPassword: '', newPassword: '' })
      },
      onError: (err) => {
        alert('Error: ' + (err.response?.data?.error || 'No se pudo cambiar la contraseña'))
      }
    }
  )

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    updateProfileMutation.mutate(profileForm)
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    changePasswordMutation.mutate(passwordForm)
  }

  const tabs = [
    { key: 'account', label: '👤 Perfil & Seguridad', icon: '👤' },
    { key: 'telegram', label: '📱 Bot Telegram & Notificaciones SOS', icon: '📱' },
    { key: 'hardware', label: '🔧 Vinculación Hardware GPS', icon: '🔧' },
  ]

  return (
    <div className="space-y-6 text-slate-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase block mb-1">
            Parámetros del Sistema
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>⚙️</span> Configuración de Plataforma & Seguridad
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Administración de credenciales, integración con Telegram SOC y vinculación de dispositivos físicos.
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
          VERSION: <span className="text-slate-200 font-bold">v2.3.0</span> • SOC ENTERPRISE
        </div>
      </div>

      {/* Freemium Limit Notice */}
      {!isPaid && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Configuración en Modo Gratuito Limitado
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Tu cuenta está limitada a configurar <strong>1 único dispositivo</strong> (vehículo o celular). Para parametrizar flotas completas, múltiples conductores y sensores avanzados, contrata una membresía oficial.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/payments')}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black rounded-xl shadow-md transition shrink-0"
          >
            💎 Ver Membresías
          </button>
        </div>
      )}

      {/* Sober Tab Navigation */}
      <div className="flex gap-1.5 bg-[#0a0f1d] border border-slate-800 p-1.5 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ────── TAB: ACCOUNT ────── */}
      {activeTab === 'account' && (
        <div className="card">
          <h2 className="card-header">
            <span>Credenciales y Perfil de Acceso</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Seguridad RBAC</span>
          </h2>
          <div className="p-2 grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs">
            {/* Profile */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Datos del Operador / Administrador
              </h3>
              <form onSubmit={handleProfileSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-semibold uppercase text-[11px]">Nombre Completo</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-semibold uppercase text-[11px]">Teléfono de Contacto</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isLoading}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 rounded-xl font-bold uppercase tracking-wider transition disabled:opacity-50"
                >
                  {updateProfileMutation.isLoading ? 'Guardando...' : 'Guardar Perfil'}
                </button>
              </form>
            </div>

            {/* Change password */}
            <div className="space-y-4 lg:border-l lg:border-slate-800/80 lg:pl-8">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Actualización de Contraseña
              </h3>
              <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-semibold uppercase text-[11px]">Contraseña Actual</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-semibold uppercase text-[11px]">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isLoading}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl font-bold uppercase tracking-wider transition disabled:opacity-50"
                >
                  {changePasswordMutation.isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ────── TAB: TELEGRAM BOT ────── */}
      {activeTab === 'telegram' && (
        <div className="space-y-6">
          {/* Main Bot Card */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl text-cyan-400 shadow-inner">
                  📱
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">Bot Oficial Telegram @EinGpsBot</h2>
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded">
                      ● Activo & Conectado
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Canal de telemetría instantánea y recepción prioritaria de alertas de pánico SOS.
                  </p>
                </div>
              </div>

              <a
                href="https://t.me/EinGpsBot"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-2 w-fit"
              >
                <span>🤖</span> Abrir @EinGpsBot
              </a>
            </div>

            {/* Quick Steps */}
            <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <strong className="text-slate-200 block text-xs">1. Iniciar el Bot</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Busca <strong>@EinGpsBot</strong> en Telegram y presiona <code>/start</code> para vincular tu chat.
                </p>
              </div>
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <strong className="text-slate-200 block text-xs">2. Alertas Críticas</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Recibe notificaciones automáticas ante presiones de botón SOS, choques o exceso de velocidad.
                </p>
              </div>
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <strong className="text-slate-200 block text-xs">3. Comandos Rápidos</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Consulta ubicación de flota con <code>/vehiculos</code> o estado general con <code>/resumen</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Panic Alert Recipients */}
          <BotUsersPanel />
        </div>
      )}

      {/* ────── TAB: HARDWARE ────── */}
      {activeTab === 'hardware' && (
        <div className="card">
          <h2 className="card-header">
            <span>Vinculación de Hardware GPS e IMEI de Flota</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Dispositivos Físicos</span>
          </h2>
          <div className="p-2 space-y-4 text-xs">
            <p className="text-slate-400 leading-relaxed">
              Vincule sus unidades vehiculares al identificador IMEI único del hardware satelital instalado y asigne el conductor responsable.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#080c18] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Vehículo</th>
                    <th className="px-4 py-3">IMEI Dispositivo</th>
                    <th className="px-4 py-3">N° SIM / Chip</th>
                    <th className="px-4 py-3">Conductor Asignado</th>
                    <th className="px-4 py-3">Modelo Hardware</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {vehicles?.map(v => (
                    <DeviceRow key={v._id} vehicle={v} drivers={drivers} />
                  ))}
                  {(!vehicles || vehicles.length === 0) && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-500 font-mono">
                        No hay vehículos registrados para vincular.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── BotUsersPanel: Manage who receives Telegram panic alerts ─────────────────
function BotUsersPanel() {
  const queryClient = useQueryClient()
  const [newUser, setNewUser] = useState({ telegramId: '', telegramUsername: '', role: 'admin' })
  const [addStatus, setAddStatus] = useState(null)

  const { data: botUsers = [], isLoading } = useQuery('botUsers', async () => {
    const res = await apiClient.get('/bot/users')
    return res.data
  })

  const addMutation = useMutation(
    async (payload) => {
      const res = await apiClient.post('/bot/users', payload)
      return res.data
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('botUsers')
        setNewUser({ telegramId: '', telegramUsername: '', role: 'admin' })
        setAddStatus({ type: 'success', msg: `Usuario @${data.telegramUsername || data.telegramId} configurado correctamente.` })
        setTimeout(() => setAddStatus(null), 5000)
      },
      onError: (err) => {
        setAddStatus({ type: 'error', msg: err.response?.data?.error || 'Error al registrar usuario' })
      }
    }
  )

  const removeMutation = useMutation(
    async (telegramId) => apiClient.delete(`/bot/users/${telegramId}`),
    {
      onSuccess: () => queryClient.invalidateQueries('botUsers'),
    }
  )

  const handleAdd = (e) => {
    e.preventDefault()
    if (!newUser.telegramId) return
    addMutation.mutate(newUser)
  }

  const [webhookLoading, setWebhookLoading] = useState(false)
  const [testAlertLoading, setTestAlertLoading] = useState(false)

  const handleSetupWebhook = async () => {
    setWebhookLoading(true)
    try {
      const baseUrl = 'https://einsoft-gp-sbcknd.vercel.app'
      const res = await apiClient.post('/bot/setup-webhook', { baseUrl })
      alert(`Webhook configurado exitosamente: ${res.data.webhookUrl}`)
    } catch (err) {
      alert(`Error al conectar Webhook: ${err.response?.data?.error || err.message}`)
    } finally {
      setWebhookLoading(false)
    }
  }

  const handleTestAlert = async () => {
    setTestAlertLoading(true)
    try {
      const res = await apiClient.post('/bot/test-alert')
      alert(`Alerta de prueba enviada a Telegram (${res.data.count} destinatarios)`)
    } catch (err) {
      alert(`Error al enviar prueba: ${err.response?.data?.error || err.message}`)
    } finally {
      setTestAlertLoading(false)
    }
  }

  return (
    <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div>
          <h3 className="text-sm font-bold text-white">Destinatarios de Alertas de Pánico SOS</h3>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Usuarios que recibirán el reporte satelital inmediato al presionar el Botón SOS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestAlert}
            disabled={testAlertLoading}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            {testAlertLoading ? 'Enviando...' : '🔔 Probar Alerta'}
          </button>
          <button
            type="button"
            onClick={handleSetupWebhook}
            disabled={webhookLoading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            {webhookLoading ? 'Conectando...' : '⚡ Vincular Webhook'}
          </button>
        </div>
      </div>

      {/* Add new bot user */}
      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="block text-[10px] font-mono uppercase text-slate-400">Telegram ID (Numérico)</label>
          <input
            type="text"
            value={newUser.telegramId}
            onChange={e => setNewUser({ ...newUser, telegramId: e.target.value })}
            placeholder="Ej: 123456789"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs font-mono focus:border-cyan-500 outline-none"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-mono uppercase text-slate-400">Username (@)</label>
          <input
            type="text"
            value={newUser.telegramUsername}
            onChange={e => setNewUser({ ...newUser, telegramUsername: e.target.value })}
            placeholder="Ej: operador_soc"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:border-cyan-500 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-mono uppercase text-slate-400">Rol de Recepción</label>
          <select
            value={newUser.role}
            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:border-cyan-500 outline-none"
          >
            <option value="admin">Admin (Todas las alertas)</option>
            <option value="operator">Operador SOC</option>
            <option value="viewer">Solo Consultas</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={addMutation.isLoading || !newUser.telegramId}
            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition disabled:opacity-50"
          >
            {addMutation.isLoading ? '...' : '+ Agregar Destinatario'}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="space-y-2 pt-2">
        {isLoading ? (
          <p className="text-slate-500 font-mono text-center py-2">Consultando registros...</p>
        ) : botUsers.length === 0 ? (
          <p className="text-slate-500 font-mono text-center py-2">No hay operadores vinculados para alertas de Telegram.</p>
        ) : (
          botUsers.map(u => (
            <div key={u._id} className="flex items-center justify-between bg-slate-950/60 rounded-xl px-3.5 py-2.5 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-slate-200">
                  {u.telegramUsername ? `@${u.telegramUsername}` : `ID: ${u.telegramId}`}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase">
                  {u.role}
                </span>
              </div>
              <button
                onClick={() => { if (confirm('¿Eliminar este destinatario de alertas?')) removeMutation.mutate(u.telegramId) }}
                className="text-[11px] text-slate-400 hover:text-red-400 transition font-semibold"
              >
                Quitar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function DeviceRow({ vehicle, drivers = [] }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    deviceIMEI: vehicle.deviceIMEI || '',
    simCardNumber: vehicle.simCardNumber || '',
    deviceModel: vehicle.deviceModel || '',
    driverId: vehicle.driver?._id || vehicle.driver || ''
  })

  const linkMutation = useMutation(
    (payload) => apiClient.post(`/vehicles/${vehicle._id}/link-device`, payload),
    {
      onSuccess: () => {
        alert(`Dispositivo sincronizado con éxito para la unidad ${vehicle.licensePlate}.`)
        queryClient.invalidateQueries('vehicles')
      },
      onError: (err) => {
        alert(`Error al vincular: ${err.response?.data?.error || 'Falló la vinculación'}`)
      }
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.deviceIMEI) return alert('El IMEI es obligatorio para poder vincular el hardware.')
    linkMutation.mutate(formData)
  }

  return (
    <tr className="hover:bg-slate-800/30 transition-colors">
      <td className="px-4 py-3 font-mono font-bold text-slate-100">
        {vehicle.licensePlate}
        <div className="text-[10px] text-slate-500 font-sans font-normal">{vehicle.make} {vehicle.model}</div>
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={formData.deviceIMEI}
          onChange={(e) => setFormData({ ...formData, deviceIMEI: e.target.value })}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-cyan-400 focus:border-cyan-500 outline-none"
          placeholder="Código IMEI"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={formData.simCardNumber}
          onChange={(e) => setFormData({ ...formData, simCardNumber: e.target.value })}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:border-cyan-500 outline-none"
          placeholder="+569..."
        />
      </td>
      <td className="px-4 py-3">
        <select
          value={formData.driverId}
          onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:border-cyan-500 outline-none"
        >
          <option value="">Sin conductor asignado</option>
          {drivers.map(d => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={formData.deviceModel}
          onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:border-cyan-500 outline-none font-mono"
          placeholder="GT06 / Coban / Teltonika"
        />
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleSubmit}
          disabled={linkMutation.isLoading}
          className="bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 rounded-lg px-3 py-1 text-[11px] font-bold uppercase transition disabled:opacity-50"
        >
          {linkMutation.isLoading ? '...' : 'Vincular'}
        </button>
      </td>
    </tr>
  )
}
