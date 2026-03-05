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

  const handlePrint = () => {
    window.print()
  }

  const exportToCSV = () => {
    if (!report) return

    const headers = ['Metric', 'Value']
    const metrics = [
      ['Total distance', `${report.metrics.totalDistance} km`],
      ['Average speed', `${report.metrics.averageSpeed} km/h`],
      ['Max speed', `${report.metrics.maxSpeed} km/h`],
      ['Fuel consumed', report.metrics.fuelConsumed],
      ['Trips count', report.metrics.tripCount]
    ]

    const csvContent = [
      headers.join(','),
      ...metrics.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_${report.vehicle.licensePlate}_${period}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          aside, nav, .card-header, button, select, label {
            display: none !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          body {
            background: white !important;
          }
          main {
            padding: 0 !important;
          }
          h1 {
            font-size: 24pt !important;
            margin-bottom: 20pt !important;
          }
        }
      `}</style>

      <div className="card no-print">
        <h1 className="card-header">Reportes y Analíticas</h1>
        <form onSubmit={handleGenerate} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo</label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">Selecciona vehículo</option>
              {vehicles.map(v => (
                <option key={v._id} value={v._id}>
                  {v.licensePlate} • {v.model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="daily">Últimas 24 horas</option>
              <option value="weekly">Últimos 7 días</option>
              <option value="monthly">Últimos 30 días</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={!selectedVehicleId || isFetching}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 w-full md:w-auto"
            >
              {isFetching ? 'Generando...' : 'Generar reporte'}
            </button>
          </div>
        </form>
      </div>

      {report && (
        <div className="card">
          <div className="card-header flex justify-between items-center no-print">
            <h2>Resumen del Reporte</h2>
            <div className="space-x-2">
              <button
                onClick={exportToCSV}
                className="px-3 py-1 bg-green-100 text-green-700 rounded border border-green-200 text-xs hover:bg-green-200"
              >
                Descargar CSV
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200 text-xs hover:bg-gray-200"
              >
                Imprimir
              </button>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Vehículo</h3>
              <p className="text-gray-700 text-lg font-bold">{report.vehicle.licensePlate}</p>
              <p className="text-gray-500 text-xs mt-1">Conductor: {report.vehicle.driver || 'No asignado'}</p>
              <p className="text-gray-500 text-xs mt-1">
                Periodo: {new Date(report.reportPeriod.start).toLocaleString()} -{' '}
                {new Date(report.reportPeriod.end).toLocaleString()}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Métricas</h3>
              <ul className="space-y-1 text-gray-700">
                <li>Distancia total: <span className="font-medium text-blue-700">{report.metrics.totalDistance} km</span></li>
                <li>Velocidad promedio: <span className="font-medium">{report.metrics.averageSpeed} km/h</span></li>
                <li>Velocidad máxima: <span className="font-medium text-red-600">{report.metrics.maxSpeed} km/h</span></li>
                <li>Combustible aprox: <span className="font-medium">{report.metrics.fuelConsumed}</span></li>
                <li>Trips (muestras): <span className="font-medium">{report.metrics.tripCount}</span></li>
              </ul>
            </div>
            <div className="md:col-span-2 border-t pt-4">
              <h3 className="font-semibold text-gray-800 mb-2">Alertas Detectadas</h3>
              {report.alertsCount === 0 ? (
                <p className="text-gray-500 italic text-xs">No se registraron alertas en este periodo.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(report.alertsByType).map(([type, count]) => (
                    <span key={type} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs border border-red-100 capitalize">
                      {type.replace('_', ' ')}: {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
