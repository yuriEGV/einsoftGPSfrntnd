import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { apiClient } from '../services/api'

export default function Reports() {
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [period, setPeriod] = useState('weekly')

  const { data: vehicles = [] } = useQuery('reports-vehicles', async () => {
    const response = await apiClient.get('/vehicles')
    return response.data
  })

  const { data: report, refetch, isFetching } = useQuery(
    ['report', selectedVehicleId, period],
    async () => {
      const response = await apiClient.get(`/reports/generate/${period}`, {
        params: { vehicleId: selectedVehicleId },
      })
      return response.data
    },
    { enabled: false },
  )

  const handleGenerate = (e) => {
    e.preventDefault()
    if (!selectedVehicleId) return
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="card-header">Reports & Analytics</h1>
        <form onSubmit={handleGenerate} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">Select vehicle</option>
              {vehicles.map(v => (
                <option key={v._id} value={v._id}>
                  {v.licensePlate} • {v.model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="daily">Last 24 hours</option>
              <option value="weekly">Last 7 days</option>
              <option value="monthly">Last 30 days</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={!selectedVehicleId || isFetching}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {isFetching ? 'Generating...' : 'Generate report'}
            </button>
          </div>
        </form>
      </div>

      {report && (
        <div className="card">
          <h2 className="card-header">Report Summary</h2>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Vehicle</h3>
              <p className="text-gray-700">{report.vehicle.licensePlate}</p>
              <p className="text-gray-500 text-xs mt-1">Driver: {report.vehicle.driver || 'N/A'}</p>
              <p className="text-gray-500 text-xs mt-1">
                Period: {new Date(report.reportPeriod.start).toLocaleString()} -{' '}
                {new Date(report.reportPeriod.end).toLocaleString()}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Metrics</h3>
              <ul className="space-y-1 text-gray-700">
                <li>Total distance: <span className="font-medium">{report.metrics.totalDistance} km</span></li>
                <li>Average speed: <span className="font-medium">{report.metrics.averageSpeed} km/h</span></li>
                <li>Max speed: <span className="font-medium">{report.metrics.maxSpeed} km/h</span></li>
                <li>Fuel consumed: <span className="font-medium">{report.metrics.fuelConsumed}</span></li>
                <li>Trips (samples): <span className="font-medium">{report.metrics.tripCount}</span></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Alerts</h3>
              <p className="text-gray-700 mb-1">Total alerts: <span className="font-medium">{report.alertsCount}</span></p>
              <ul className="list-disc list-inside text-gray-700 text-xs">
                {Object.entries(report.alertsByType).map(([type, count]) => (
                  <li key={type}>{type}: {count}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
