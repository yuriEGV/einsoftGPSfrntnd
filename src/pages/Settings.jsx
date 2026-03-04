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

  const updateProfileMutation = useMutation(
    (payload) => apiClient.put('/users/profile', payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('profile')
      },
    },
  )

  const changePasswordMutation = useMutation(
    (payload) => apiClient.post('/users/change-password', payload),
  )

  const createVehicleMutation = useMutation(
    (payload) => apiClient.post('/vehicles', payload),
    {
      onSuccess: () => {
        setVehicleForm({
          licensePlate: '',
          make: '',
          model: '',
          year: '',
          color: '',
          assignedDriver: '',
        })
        queryClient.invalidateQueries('vehicles')
        queryClient.invalidateQueries('reports-vehicles')
      },
    },
  )

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    updateProfileMutation.mutate(profileForm)
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    changePasswordMutation.mutate(passwordForm)
  }

  const handleVehicleSubmit = (e) => {
    e.preventDefault()
    createVehicleMutation.mutate({
      ...vehicleForm,
      year: vehicleForm.year ? Number(vehicleForm.year) : undefined,
    })
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="card-header">Settings</h1>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile */}
          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Profile</h2>
            <form onSubmit={handleProfileSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Save profile
              </button>
            </form>
          </div>

          {/* Change password */}
          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Change password</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-700 mb-1">Current password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">New password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium"
              >
                Update password
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* GPS Hardware Management */}
      <div className="card">
        <h2 className="card-header">Gestión de Hardware GPS (Chips)</h2>
        <div className="p-6">
          <p className="text-gray-600 text-sm mb-4">
            Desde aquí puedes vincular rápidamente los dispositivos GPS a tus vehículos.
            Introduce el IMEI del equipo, el número de la SIM instalada y el modelo del hardware.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-2">Vehículo</th>
                  <th className="px-4 py-2">IMEI</th>
                  <th className="px-4 py-2">SIM / Chip</th>
                  <th className="px-4 py-2">Modelo</th>
                  <th className="px-4 py-2">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vehicles?.map(v => (
                  <DeviceRow key={v._id} vehicle={v} />
                ))}
                {(!vehicles || vehicles.length === 0) && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                      No hay vehículos registrados para configurar.
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

function DeviceRow({ vehicle }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    deviceIMEI: vehicle.deviceIMEI || '',
    simCardNumber: vehicle.simCardNumber || '',
    deviceModel: vehicle.deviceModel || ''
  })

  const linkMutation = useMutation(
    (payload) => apiClient.post(`/vehicles/${vehicle._id}/link-device`, payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('vehicles')
      }
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    linkMutation.mutate(formData)
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900">
        {vehicle.licensePlate}
        <div className="text-xs text-gray-500">{vehicle.make} {vehicle.model}</div>
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={formData.deviceIMEI}
          onChange={(e) => setFormData({ ...formData, deviceIMEI: e.target.value })}
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono"
          placeholder="IMEI"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={formData.simCardNumber}
          onChange={(e) => setFormData({ ...formData, simCardNumber: e.target.value })}
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
          placeholder="SIM #"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={formData.deviceModel}
          onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
          placeholder="GT06 / Coban / etc"
        />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={handleSubmit}
          disabled={linkMutation.isLoading}
          className="w-full bg-blue-600 text-white rounded px-3 py-1 text-xs font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {linkMutation.isLoading ? '...' : 'Vincular'}
        </button>
      </td>
    </tr>
  )
}
