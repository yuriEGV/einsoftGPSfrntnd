import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

export default function Geofences() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    description: '',
    radius: 500,
  })

  const { data: geofences = [], isLoading } = useQuery('geofences', async () => {
    const response = await apiClient.get('/geofences')
    return response.data
  })

  const createMutation = useMutation(
    () => apiClient.post('/geofences', {
      name: form.name,
      description: form.description,
      geometry: {
        type: 'Point',
        coordinates: [-74.0, 40.72], // In a real app, this would be selected on map
      },
      radius: Number(form.radius),
    }),
    {
      onSuccess: () => {
        setForm({ name: '', description: '', radius: 500 })
        queryClient.invalidateQueries('geofences')
      },
    },
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name) return
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Geofences</h1>
        <p className="text-sm text-gray-500">
          Total: {geofences.length} zones
        </p>
      </div>

      <div className="card">
        <h2 className="card-header">Create quick radius zone</h2>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Radius (meters)</label>
            <input
              type="number"
              value={form.radius}
              onChange={(e) => setForm({ ...form, radius: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              min="50"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Create geofence
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 className="card-header">Existing zones</h2>
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Loading geofences...</div>
        ) : geofences.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No geofences created yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Name</th>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Description</th>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Radius</th>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Assigned vehicles</th>
              </tr>
            </thead>
            <tbody>
              {geofences.map((g) => (
                <tr key={g._id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{g.name}</td>
                  <td className="px-4 py-2 text-gray-600">{g.description}</td>
                  <td className="px-4 py-2">{g.radius || '-'}</td>
                  <td className="px-4 py-2">
                    {g.assignedVehicles?.length || 0}
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

