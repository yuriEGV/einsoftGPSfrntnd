import React, { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    licensePlate: '',
    make: '',
    model: '',
    year: '',
    color: '',
  })
  const [deviceForm, setDeviceForm] = useState({
    deviceIMEI: '',
    simCardNumber: '',
    deviceModel: '',
    driverId: ''
  })

  // Track whether forms have been initialized from server data (only do it once)
  const editFormInitialized = useRef(false)
  const deviceFormInitialized = useRef(false)

  const { data, isLoading, error, refetch } = useQuery(['vehicle', id], async () => {
    const response = await apiClient.get(`/vehicles/${id}`)
    return response.data
  }, {
    // Do NOT auto-refetch — it would reset form fields the user is currently filling in.
    // The form is only initialized ONCE via the refs above.
    refetchInterval: false,
    refetchOnWindowFocus: false,
    onSuccess: (v) => {
      // Always sync the edit form (user opens edit modal after refetch)
      if (!editFormInitialized.current || !isEditing) {
        setEditForm({
          licensePlate: v.licensePlate || '',
          make: v.make || '',
          model: v.model || '',
          year: v.year || '',
          color: v.color || '',
        })
        editFormInitialized.current = true
      }
      // Only initialize deviceForm ONCE — never overwrite while user is typing
      if (!deviceFormInitialized.current) {
        setDeviceForm({
          deviceIMEI: v.deviceIMEI || '',
          simCardNumber: v.simCardNumber || '',
          deviceModel: v.deviceModel || '',
          driverId: v.driver?._id || ''
        })
        deviceFormInitialized.current = true
      }
    },
  })

  const { data: drivers = [] } = useQuery('drivers', async () => {
    const response = await apiClient.get('/users')
    return response.data.filter(u => u.role === 'driver')
  })

  // Edit basic vehicle info
  const editVehicleMutation = useMutation(
    (payload) => apiClient.put(`/vehicles/${id}`, payload),
    {
      onSuccess: () => {
        setIsEditing(false)
        queryClient.invalidateQueries(['vehicle', id])
        queryClient.invalidateQueries('vehicles')
      },
    },
  )

  // Link device / IMEI
  const linkDeviceMutation = useMutation(
    (payload) => apiClient.post(`/vehicles/${id}/link-device`, payload),
    {
      onSuccess: () => {
        refetch()
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
      <div className="card p-6">
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600 mb-4">← Volver</button>
        <p className="text-red-600 text-sm">Error al cargar el vehículo. ¿Está asignado a tu empresa?</p>
      </div>
    )
  }

  const vehicle = data
  const imei = vehicle.deviceIMEI

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/vehicles')}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Vehículos
        </button>
      </div>

      {/* ===== INFO PRINCIPAL ===== */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚗</span>
            <div>
              <h1 className="text-xl font-bold">{vehicle.licensePlate}</h1>
              <p className="text-sm text-gray-500 font-normal">{vehicle.make} {vehicle.model} {vehicle.year && `• ${vehicle.year}`}</p>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${isEditing
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20'
              }`}
          >
            {isEditing ? '✕ Cancelar' : '✏️ Editar Vehículo'}
          </button>
        </div>

        {isEditing ? (
          /* ===== FORMULARIO DE EDICIÓN ===== */
          <form
            onSubmit={(e) => {
              e.preventDefault()
              editVehicleMutation.mutate({
                ...editForm,
                year: editForm.year ? Number(editForm.year) : undefined,
              })
            }}
            className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              { label: 'Patente', key: 'licensePlate', placeholder: 'ABCD-12', required: true },
              { label: 'Marca', key: 'make', placeholder: 'Ej: Chevrolet', required: true },
              { label: 'Modelo', key: 'model', placeholder: 'Ej: Sail', required: true },
              { label: 'Año', key: 'year', placeholder: '2024', type: 'number' },
              { label: 'Color', key: 'color', placeholder: 'Ej: Blanco' },
            ].map(({ label, key, placeholder, required, type }) => (
              <div key={key}>
                <label className="block text-[10px] font-black text-blue-700 uppercase mb-1">{label}</label>
                <input
                  type={type || 'text'}
                  value={editForm[key]}
                  onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                  placeholder={placeholder}
                  required={required}
                  className="w-full border-2 border-blue-100 rounded-xl px-4 py-2 focus:border-blue-500 outline-none transition-all text-sm"
                />
              </div>
            ))}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={editVehicleMutation.isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg disabled:opacity-50 transition-all"
              >
                {editVehicleMutation.isLoading ? 'Guardando...' : '✓ Guardar Cambios'}
              </button>
            </div>
            {editVehicleMutation.isError && (
              <p className="col-span-full text-red-600 text-xs mt-1">
                Error: {editVehicleMutation.error?.response?.data?.error || 'No se pudo guardar'}
              </p>
            )}
          </form>
        ) : (
          /* ===== VISTA DE DATOS ===== */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Estado</h2>
              <p className="text-sm"><span className="font-medium capitalize">{vehicle.status}</span></p>
              <p className="text-sm text-gray-600 mt-1">Velocidad: <span className="font-medium">{vehicle.speed} km/h</span></p>
              <p className="text-sm text-gray-600 mt-1">Odómetro: <span className="font-medium">{vehicle.odometer} km</span></p>
              {vehicle.sensors?.fuel != null && (
                <p className="text-sm text-gray-600 mt-1">Combustible: <span className={`font-bold ${vehicle.sensors.fuel <= 15 ? 'text-red-600' : 'text-emerald-600'}`}>{vehicle.sensors.fuel}%</span></p>
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Conductor</h2>
              <p className="text-sm text-gray-600">{vehicle.assignedDriver || (vehicle.driver ? vehicle.driver.name : 'Sin asignar')}</p>
              {vehicle.driver && (
                <p className="text-xs text-gray-500 mt-1">{vehicle.driver.email}</p>
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Ubicación</h2>
              <p className="text-sm text-gray-600">{vehicle.location?.address || 'Sin dirección'}</p>
              <p className="text-xs text-gray-500 mt-1">{vehicle.location?.city} {vehicle.location?.country}</p>
            </div>
          </div>
        )}
      </div>

      {/* ===== CONTROL REMOTO ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">Control Remoto</h2>
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">Motor / Cortacorriente</p>
                <p className="text-xs text-gray-500">Bloqueo preventivo del motor</p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm(vehicle.motorCutStatus ? '¿RESTABLECER MOTOR?' : '¿BLOQUEAR MOTOR INMEDIATAMENTE? Esta acción detendrá el vehículo.')) {
                    apiClient.post(`/vehicles/${id}/motor-cut`, { activate: !vehicle.motorCutStatus })
                      .then(() => refetch())
                  }
                }}
                className={`px-4 py-2 rounded-lg font-bold text-sm ${vehicle.motorCutStatus
                  ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                  : 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
                  }`}
              >
                {vehicle.motorCutStatus ? '🔓 Restablecer Motor' : '🔒 Cortar Motor'}
              </button>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="font-semibold text-gray-800">Micrófono Espía</p>
                <p className="text-xs text-gray-500">Escucha activa en cabina</p>
              </div>
              <button
                onClick={() => {
                  apiClient.post(`/vehicles/${id}/microphone`, { activate: true })
                    .then(() => alert('Comando de escucha enviado al dispositivo'))
                }}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold text-sm border border-blue-200 hover:bg-blue-200"
              >
                🎙️ Activar Escucha
              </button>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">Información del Dispositivo</h2>
          <div className="space-y-3 text-sm">
            {[
              { label: 'IMEI', value: vehicle.deviceIMEI || 'No vinculado', mono: true },
              { label: 'SIM Card', value: vehicle.simCardNumber || 'N/A' },
              { label: 'Modelo GPS', value: vehicle.deviceModel || 'N/A' },
              { label: 'Cortacorriente', value: vehicle.motorCutStatus ? '🔒 ACTIVO' : '🟢 Normal' },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex justify-between border-b pb-2">
                <span className="text-gray-500">{label}</span>
                <span className={`font-bold text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== VINCULAR DISPOSITIVO ===== */}
      <div className="card">
        <h2 className="card-header">Vincular Dispositivo GPS / Sensor</h2>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-4">
              Ingresa el IMEI del dispositivo telemático para vincularlo a este vehículo.
              A partir de ese momento, cada dato enviado se asociará automáticamente.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!deviceForm.deviceIMEI) return
                linkDeviceMutation.mutate(deviceForm)
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={deviceForm.deviceIMEI}
                  onChange={(e) => setDeviceForm({ ...deviceForm, deviceIMEI: e.target.value })}
                  placeholder="IMEI del dispositivo *"
                  required
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="text"
                  value={deviceForm.simCardNumber}
                  onChange={(e) => setDeviceForm({ ...deviceForm, simCardNumber: e.target.value })}
                  placeholder="Número de SIM"
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="text"
                  value={deviceForm.deviceModel}
                  onChange={(e) => setDeviceForm({ ...deviceForm, deviceModel: e.target.value })}
                  placeholder="Modelo (GT06, TK103, etc)"
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <select
                  value={deviceForm.driverId}
                  onChange={(e) => setDeviceForm({ ...deviceForm, driverId: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Asignar conductor (opcional)</option>
                  {drivers.map(d => (
                    <option key={d._id} value={d._id}>{d.name} ({d.email})</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={linkDeviceMutation.isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium px-4 py-2 disabled:bg-blue-300 md:col-span-2 transition-all"
                >
                  {linkDeviceMutation.isLoading ? 'Vinculando...' : '🔗 Vincular Dispositivo'}
                </button>
                {linkDeviceMutation.isSuccess && (
                  <p className="col-span-2 text-emerald-600 text-xs font-bold">✓ Dispositivo vinculado correctamente</p>
                )}
              </div>
            </form>
          </div>
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800">Ejemplo de payload para el dispositivo</p>
            <pre className="whitespace-pre-wrap break-all text-[10px] font-mono bg-slate-100 p-3 rounded-lg">
              {`POST ${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/sensors/upload
Content-Type: application/json

{
  "deviceIMEI": "${imei || '123456789012345'}",
  "gps": {
    "latitude": -33.4489,
    "longitude": -70.6693,
    "speed": 45
  },
  "fuel": { "level": 70 }
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
