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

      {/* Quick vehicle create */}
      <div className="card">
        <h2 className="card-header">Add vehicle to fleet</h2>
        <form onSubmit={handleVehicleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 mb-1">License plate</label>
            <input
              type="text"
              value={vehicleForm.licensePlate}
              onChange={(e) => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value.toUpperCase() })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Make</label>
            <input
              type="text"
              value={vehicleForm.make}
              onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Model</label>
            <input
              type="text"
              value={vehicleForm.model}
              onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Year</label>
            <input
              type="number"
              value={vehicleForm.year}
              onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Color</label>
            <input
              type="text"
              value={vehicleForm.color}
              onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Assigned driver</label>
            <input
              type="text"
              value={vehicleForm.assignedDriver}
              onChange={(e) => setVehicleForm({ ...vehicleForm, assignedDriver: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              Add vehicle
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
