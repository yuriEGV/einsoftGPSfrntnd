import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

const severities = ['all', 'low', 'medium', 'high', 'critical']
const statuses = ['all', 'unacknowledged', 'acknowledged']

export default function Alerts() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ severity: 'all', status: 'all' })

  const { data: alerts = [], isLoading } = useQuery(
    ['alerts-list', filters],
    async () => {
      const response = await apiClient.get('/alerts', {
        params: {
          severity: filters.severity,
          status: filters.status,
          limit: 100,
        },
      })
      return response.data
    },
  )

  const acknowledgeMutation = useMutation(
    (alertId) => apiClient.post(`/alerts/${alertId}/acknowledge`, { notes: '' }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('alerts-list')
        queryClient.invalidateQueries('alerts')
      },
    },
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
        <p className="text-sm text-gray-500">
          Showing {alerts.length} alerts
        </p>
      </div>

      <div className="card">
        <div className="p-4 flex flex-wrap gap-4 text-sm">
          <div>
            <label className="block text-gray-700 mb-1">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              {severities.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-gray-200">
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No alerts found.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-700 font-medium">Time</th>
                  <th className="px-4 py-2 text-left text-gray-700 font-medium">Vehicle</th>
                  <th className="px-4 py-2 text-left text-gray-700 font-medium">Type</th>
                  <th className="px-4 py-2 text-left text-gray-700 font-medium">Severity</th>
                  <th className="px-4 py-2 text-left text-gray-700 font-medium">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert._id} className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      {new Date(alert.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {alert.vehicle?.licensePlate || 'N/A'}
                    </td>
                    <td className="px-4 py-2 capitalize">
                      {alert.type?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-2 capitalize">
                      {alert.severity}
                    </td>
                    <td className="px-4 py-2">
                      {alert.acknowledged ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                          Acknowledged
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeMutation.mutate(alert._id)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium"
                        >
                          Mark as read
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

