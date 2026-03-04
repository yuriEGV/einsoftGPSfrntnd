import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

export default function VehicleDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    deviceIMEI: '',
    simCardNumber: '',
    deviceModel: ''
  })

  const { data, isLoading, error } = useQuery(['vehicle', id], async () => {
    const response = await apiClient.get(`/vehicles/${id}`)
    return response.data
  }, {
    onSuccess: (v) => {
      setForm({
        deviceIMEI: v.deviceIMEI || '',
        simCardNumber: v.simCardNumber || '',
        deviceModel: v.deviceModel || ''
      })
    },
  })

  const linkDeviceMutation = useMutation(
    (payload) => apiClient.post(`/vehicles/${id}/link-device`, payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vehicle', id])
        queryClient.invalidateQueries('vehicles')
      },
    },
  )

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <h1 className="card-header">Vehicle Details</h1>
        <p className="text-red-600 text-sm">Error loading vehicle details.</p>
      </div>
    )
  }

  const vehicle = data

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="card-header flex items-center justify-between">
          <span>Vehículo {vehicle.licensePlate}</span>
          <span className="text-sm text-gray-500">{vehicle.make} {vehicle.model} • {vehicle.year}</span>
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Estado</h2>
            <p className="text-sm"><span className="font-medium capitalize">{vehicle.status}</span></p>
            <p className="text-sm text-gray-600 mt-1">Velocidad: <span className="font-medium">{vehicle.speed} km/h</span></p>
            <p className="text-sm text-gray-600 mt-1">Odómetro: <span className="font-medium">{vehicle.odometer} km</span></p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Conductor</h2>
            <p className="text-sm text-gray-600">{vehicle.assignedDriver || 'Sin asignar'}</p>
            {vehicle.driver && (
              <p className="text-xs text-gray-500 mt-1">
                {vehicle.driver.name} ({vehicle.driver.email})
              </p>
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Ubicación</h2>
            <p className="text-sm text-gray-600">{vehicle.location?.address || 'Sin dirección'}</p>
            <p className="text-xs text-gray-500 mt-1">
              {vehicle.location?.city} {vehicle.location?.country}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-header">Dispositivo / sensor</h2>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-gray-700 mb-2">
              IMEI actual:{' '}
              <span className="font-mono font-semibold">
                {vehicle.deviceIMEI || 'No vinculado'}
              </span>
            </p>
            {vehicle.simCardNumber && (
              <p className="text-gray-700 mb-2 text-xs">
                SIM / Chip: <span className="font-semibold">{vehicle.simCardNumber}</span>
              </p>
            )}
            {vehicle.deviceModel && (
              <p className="text-gray-700 mb-2 text-xs">
                Modelo: <span className="font-semibold">{vehicle.deviceModel}</span>
              </p>
            )}
            <p className="text-gray-500 text-xs mt-4">
              Vincula el IMEI del GPS / dispositivo telemático al vehículo. A partir de ese momento,
              los datos que envíe el dispositivo a la API se asociarán a este vehículo.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!form.deviceIMEI) return
                linkDeviceMutation.mutate(form)
              }}
              className="mt-4 space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={form.deviceIMEI}
                  onChange={(e) => setForm({ ...form, deviceIMEI: e.target.value })}
                  placeholder="IMEI del dispositivo"
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  value={form.simCardNumber}
                  onChange={(e) => setForm({ ...form, simCardNumber: e.target.value })}
                  placeholder="Número de SIM"
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  value={form.deviceModel}
                  onChange={(e) => setForm({ ...form, deviceModel: e.target.value })}
                  placeholder="Modelo (GT06, etc)"
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
                <button
                  type="submit"
                  disabled={linkDeviceMutation.isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium px-4 py-2 disabled:bg-blue-300"
                >
                  {linkDeviceMutation.isLoading ? 'Vinculando...' : 'Vincular dispositivo'}
                </button>
              </div>
            </form>
          </div>
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800">Ejemplo de payload para enviar datos a la API</p>
            <pre className="whitespace-pre-wrap break-all">
              {`POST ${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/sensors/upload
Content-Type: application/json

{
  "deviceIMEI": "${imei || '123456789012345'}",
  "gps": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "speed": 45,
    "heading": 180
  },
  "fuel": {
    "level": 70
  }
}`}
            </pre>
            <p>
              Cada vez que el dispositivo envíe datos con ese <span className="font-mono">deviceIMEI</span>, la plataforma
              actualizará la posición, velocidad y nivel de combustible del vehículo.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
