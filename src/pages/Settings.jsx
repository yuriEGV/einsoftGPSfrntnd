import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

export default function Settings() {
  const queryClient = useQueryClient()
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [vehicleForm, setVehicleForm] = useState({
    licensePlate: '',
    make: '',
    model: '',
    year: '',
    color: '',
    assignedDriver: '',
  })

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
        alert('Perfil actualizado correctamente')
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Configuración</h1>
        <p className="text-sm text-gray-500">v2.2.0 - Correlación</p>
      </div>

      <div className="card">
        <h1 className="card-header">Configuración de Cuenta</h1>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile */}
          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-4 tracking-tight uppercase">Perfil de Usuario</h2>
            <form onSubmit={handleProfileSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-700 mb-1 font-semibold">Nombre</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1 font-semibold">Teléfono</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={updateProfileMutation.isLoading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-900/10 transition-all disabled:opacity-50"
              >
                {updateProfileMutation.isLoading ? 'Guardando...' : 'Guardar Perfil'}
              </button>
            </form>
          </div>

          {/* Change password */}
          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-4 tracking-tight uppercase">Seguridad / Contraseña</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-700 mb-1 font-semibold">Contraseña Actual</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1 font-semibold">Nueva Contraseña</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={changePasswordMutation.isLoading}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold shadow-lg shadow-slate-900/10 transition-all disabled:opacity-50"
              >
                {changePasswordMutation.isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* GPS Hardware Management */}
      <div className="card overflow-hidden">
        <h2 className="card-header bg-emerald-600 text-white">Gestión de Hardware GPS y Correlación de Flota</h2>
        <div className="p-6">
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Utilice esta tabla para **vincular definitivamente** sus vehículos a sus dispositivos físicos (IMEI) y asignar inmediatamente al conductor que operará la unidad.
            Este paso es crucial para habilitar el seguimiento en tiempo real y la gestión de alertas.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-black tracking-widest border-b text-center">
                <tr>
                  <th className="px-4 py-3 text-left">Vehículo</th>
                  <th className="px-4 py-3">IMEI Dispositivo</th>
                  <th className="px-4 py-3">Chip / SIM</th>
                  <th className="px-4 py-3">Conductor</th>
                  <th className="px-4 py-3">Modelo</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicles?.map(v => (
                  <DeviceRow key={v._id} vehicle={v} drivers={drivers} />
                ))}
                {(!vehicles || vehicles.length === 0) && (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-gray-400 italic font-medium">
                      Actualmente no hay vehículos registrados en su flota para vincular.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
        alert(`✅ Sincronización exitosa: El vehículo ${vehicle.licensePlate} ha sido vinculado al hardware indicado.`)
        queryClient.invalidateQueries('vehicles')
      },
      onError: (err) => {
        const msg = err.response?.data?.error || 'Falló la vinculación.'
        alert(`❌ Error al vincular: ${msg}`)
      }
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.deviceIMEI) return alert('El IMEI es obligatorio para poder vincular el hardware.')
    linkMutation.mutate(formData)
  }

  return (
    <tr className="hover:bg-blue-50/30 transition-colors">
      <td className="px-4 py-4">
        <div className="font-black text-blue-900 leading-tight">{vehicle.licensePlate}</div>
        <div className="text-[10px] text-gray-400 font-bold uppercase">{vehicle.make} {vehicle.model}</div>
      </td>
      <td className="px-4 py-4">
        <input
          type="text"
          value={formData.deviceIMEI}
          onChange={(e) => setFormData({ ...formData, deviceIMEI: e.target.value })}
          className="w-full border-2 border-slate-100 rounded-lg px-2 py-1.5 text-xs font-mono focus:border-blue-500 outline-none bg-white transition-all shadow-sm"
          placeholder="IMEI"
        />
      </td>
      <td className="px-4 py-4">
        <input
          type="text"
          value={formData.simCardNumber}
          onChange={(e) => setFormData({ ...formData, simCardNumber: e.target.value })}
          className="w-full border-2 border-slate-100 rounded-lg px-2 py-1.5 text-xs focus:border-blue-500 outline-none bg-white transition-all shadow-sm"
          placeholder="Chip #"
        />
      </td>
      <td className="px-4 py-4">
        <select
          value={formData.driverId}
          onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
          className="w-full border-2 border-slate-100 rounded-lg px-2 py-1.5 text-xs focus:border-blue-500 outline-none bg-white transition-all shadow-sm cursor-pointer"
        >
          <option value="">Seleccionar Conductor...</option>
          {drivers.map(d => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-4">
        <input
          type="text"
          value={formData.deviceModel}
          onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
          className="w-full border-2 border-slate-100 rounded-lg px-2 py-1.5 text-xs focus:border-blue-500 outline-none bg-white transition-all shadow-sm"
          placeholder="GT06 / Coban"
        />
      </td>
      <td className="px-4 py-4 text-right">
        <button
          onClick={handleSubmit}
          disabled={linkMutation.isLoading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10 disabled:bg-gray-300 transition-all hover:-translate-y-0.5"
        >
          {linkMutation.isLoading ? '...' : 'Vincular'}
        </button>
      </td>
    </tr>
  )
}
