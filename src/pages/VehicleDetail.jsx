import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'
import MapComponent from '../components/MapComponent'

// Global singleton: only ONE vehicle can be live-tracked per browser session at a time.
// Key = vehicleId, value = watchId from navigator.geolocation.watchPosition
const ACTIVE_TRACKER_KEY = 'einsoft_active_tracker_vehicle_id'

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

  // Live Auto-Tracker Gateway State
  const [isAutoTracking, setIsAutoTracking] = useState(false)
  const [liveLocationStats, setLiveLocationStats] = useState(null)
  const [sentPacketsCount, setSentPacketsCount] = useState(0)
  const [gpsAccuracyWarning, setGpsAccuracyWarning] = useState(null)
  const [mapKey, setMapKey] = useState(0)  // bump to force map re-mount
  const watchIdRef = useRef(null)

  const mapSectionRef = useRef(null)

  const handleLocateOnMap = () => {
    setMapKey(prev => prev + 1)
    refetch()
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // Track whether forms have been initialized from server data (only do it once)
  const editFormInitialized = useRef(false)
  const deviceFormInitialized = useRef(false)

  // ─── On mount: check if THIS vehicle already has an active tracker ──────────
  useEffect(() => {
    const activeId = sessionStorage.getItem(ACTIVE_TRACKER_KEY)
    if (activeId === id) {
      // This vehicle's tracker is still running from a previous visit
      setIsAutoTracking(true)
    }
    // Cleanup on unmount — do NOT kill the watch here; it continues in background
    return () => {}
  }, [id])

  const { data, isLoading, error, refetch } = useQuery(['vehicle', id], async () => {
    const response = await apiClient.get(`/vehicles/${id}`)
    return response.data
  }, {
    refetchInterval: 5000, // Always auto-refresh location every 5s from backend (Hardware GPS / Smart Tag / Webhook)
    refetchOnWindowFocus: true,
    onSuccess: (v) => {
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

  // ─── Stop any existing tracker for a different vehicle ──────────────────────
  const stopCurrentTracker = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  // Cleanup on unmount (stop the geolocation watch when leaving the page)
  useEffect(() => {
    return () => {
      // Only fully stop if we navigate away from this vehicle's page
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
        sessionStorage.removeItem(ACTIVE_TRACKER_KEY)
        setIsAutoTracking(false)
      }
    }
  }, [id])

  const toggleLiveAutoTracking = () => {
    if (isAutoTracking) {
      stopCurrentTracker()
      sessionStorage.removeItem(ACTIVE_TRACKER_KEY)
      setIsAutoTracking(false)
      setLiveLocationStats(null)
      setSentPacketsCount(0)
      return
    }

    if (!navigator.geolocation) {
      alert('Tu navegador o dispositivo no soporta geolocalización.')
      return
    }

    // Check if another vehicle is already being tracked in this session
    const activeId = sessionStorage.getItem(ACTIVE_TRACKER_KEY)
    if (activeId && activeId !== id) {
      const confirmed = window.confirm(
        `⚠️ Ya hay un rastreo activo para otro vehículo en esta sesión.\n\n` +
        `¿Deseas detener el rastreo anterior y comenzar a rastrear este vehículo?\n\n` +
        `(El GPS del dispositivo solo puede vincularse a un vehículo a la vez)`
      )
      if (!confirmed) return
      // Stop the previous tracker
      stopCurrentTracker()
    }

    // Validate that this vehicle has a real IMEI to prevent sending GPS to wrong vehicle
    const imeiToUse = data?.deviceIMEI || deviceForm.deviceIMEI
    if (!imeiToUse || imeiToUse === 'XTAG11-DEMO') {
      alert(
        '⚠️ Este vehículo no tiene un dispositivo GPS vinculado.\n\n' +
        'Para usar el Modo Gateway (rastreo desde tu teléfono), primero debes:\n' +
        '1. Ir a la sección "Vincular Dispositivo GPS" al final de esta página.\n' +
        '2. Ingresar el IMEI del dispositivo GPS instalado en el vehículo.\n' +
        '3. Hacer clic en "Vincular Dispositivo".\n\n' +
        'Esto asegura que los datos GPS se envíen al vehículo correcto.'
      )
      return
    }

    setIsAutoTracking(true)
    setSentPacketsCount(0)
    sessionStorage.setItem(ACTIVE_TRACKER_KEY, id)

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const accuracyM = Math.round(pos.coords.accuracy)

        // ─── Accuracy filter ───────────────────────────────────────────────
        // Discard readings with accuracy worse than 200m — those are cached
        // or cell-tower-only positions that don't reflect real GPS location.
        if (accuracyM > 200) {
          setGpsAccuracyWarning(`⚠️ Precisión GPS baja (±${accuracyM}m). Espera que el GPS del teléfono mejore...`)
          return  // don't send bad data to server
        }
        setGpsAccuracyWarning(null)

        const stats = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
          accuracy: accuracyM,
          time: new Date().toLocaleTimeString(),
        }
        setLiveLocationStats(stats)

        apiClient.post('/sensors/upload', {
          deviceIMEI: imeiToUse,
          gps: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            speed: stats.speed,
            heading: pos.coords.heading || 0,
          }
        }).then(() => {
          setSentPacketsCount(prev => prev + 1)
          queryClient.invalidateQueries(['vehicle', id])
        }).catch(err => {
          console.error('Error enviando posición live:', err)
        })
      },
      (err) => {
        console.error('Geolocation watch error:', err)
        if (err.code !== 3) { // 3 = timeout, non-fatal
          alert('Error leyendo GPS del dispositivo: ' + err.message)
          setIsAutoTracking(false)
          sessionStorage.removeItem(ACTIVE_TRACKER_KEY)
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,      // ← CRITICAL: never use cached GPS position
        timeout: 30000,     // allow 30s to get a fresh GPS lock
      }
    )

    watchIdRef.current = watchId
  }

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

  // Reset stale/wrong location from DB
  const resetLocationMutation = useMutation(
    () => apiClient.post(`/vehicles/${id}/reset-location`),
    {
      onSuccess: () => {
        setMapKey(k => k + 1)  // force map re-mount so stale tile doesn't linger
        refetch()
        queryClient.invalidateQueries(['vehicle', id])
        queryClient.invalidateQueries('vehicles')
      },
    },
  )

  // Set manual location (e.g. Cerro Placeres)
  const setLocationMutation = useMutation(
    (payload) => apiClient.post(`/vehicles/${id}/set-location`, payload),
    {
      onSuccess: () => {
        setMapKey(k => k + 1)
        refetch()
        queryClient.invalidateQueries(['vehicle', id])
        queryClient.invalidateQueries('vehicles')
      },
    },
  )

  // Delete vehicle
  const deleteVehicleMutation = useMutation(
    () => apiClient.delete(`/vehicles/${id}`),
    {
      onSuccess: () => {
        stopCurrentTracker()
        sessionStorage.removeItem(ACTIVE_TRACKER_KEY)
        queryClient.invalidateQueries('vehicles')
        navigate('/vehicles')
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
        <p className="text-red-600 text-sm">Error al cargar el vehículo. ¿Está asignado a tu cuenta?</p>
      </div>
    )
  }

  const vehicle = data
  const imei = vehicle.deviceIMEI

  // ─── Smart Tag detection ──────────────────────────────────────────────────
  // Smart Tags (BLE beacons like XTAG11, TomVista, etc.) have NO onboard sensors.
  // They don't measure fuel, RPM, or real motion. GPS speed is always noise drift.
  const isSmartTag = (() => {
    const m = (vehicle.deviceModel || '').toLowerCase()
    return ['xtag', 'smart tag', 'smarttag', 'beacon', 'tomvista', 'tagx',
      'cx-xtag', 'xtag11', 'find hub', 'tile', 'airtag', 'keyfi',
    ].some(k => m.includes(k))
  })()

  // Compute live map position — prefer live stats if tracking, otherwise vehicle data
  const mapVehicle = isAutoTracking && liveLocationStats
    ? {
        ...vehicle,
        status: 'active',
        location: {
          ...vehicle.location,
          coordinates: [liveLocationStats.lng, liveLocationStats.lat],
        },
        speed: liveLocationStats.speed,
      }
    : vehicle

  // Compute metrics from vehicle data
  const uptime = vehicle.lastUpdate
    ? Math.round((Date.now() - new Date(vehicle.lastUpdate)) / 60000)
    : null
  // Smart Tags never have fuel sensors — show null to trigger 'N/A' display
  const fuelLevel = isSmartTag ? null : (vehicle.sensors?.fuel ?? null)
  const odometer = vehicle.odometer || 0
  // Smart Tags: ignore DB speed (GPS noise). Show live speed only when gateway active.
  const speed = isSmartTag
    ? (isAutoTracking && liveLocationStats ? liveLocationStats.speed : 0)
    : (vehicle.speed || (isAutoTracking && liveLocationStats ? liveLocationStats.speed : 0))

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
        <div className="card-header flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚗</span>
            <div>
              <h1 className="text-xl font-bold">{vehicle.licensePlate}</h1>
              <p className="text-sm text-gray-500 font-normal">{vehicle.make} {vehicle.model} {vehicle.year && `• ${vehicle.year}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${isEditing
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20'
                }`}
            >
              {isEditing ? '✕ Cancelar' : '✏️ Editar Vehículo'}
            </button>
            <button
              onClick={() => {
                if (window.confirm(`¿Estás seguro de eliminar permanentemente el vehículo "${vehicle.licensePlate}"? Esta acción borrará todo su historial y no se puede deshacer.`)) {
                  deleteVehicleMutation.mutate()
                }
              }}
              disabled={deleteVehicleMutation.isLoading}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            >
              {deleteVehicleMutation.isLoading ? 'Eliminando...' : '🗑️ Eliminar'}
            </button>
          </div>
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
              <p className="text-sm text-gray-600 mt-1">Velocidad: <span className="font-medium">{speed} km/h{isSmartTag && speed === 0 ? ' (detenido)' : ''}</span></p>
              <p className="text-sm text-gray-600 mt-1">Odómetro: <span className="font-medium">{odometer} km</span></p>
              {!isSmartTag && fuelLevel != null && (
                <p className="text-sm text-gray-600 mt-1">Combustible: <span className={`font-bold ${fuelLevel <= 15 ? 'text-red-600' : 'text-emerald-600'}`}>{fuelLevel}%</span></p>
              )}
              {isSmartTag && (
                <p className="text-xs text-gray-400 mt-1">🏷️ Smart Tag — sin sensores OBD2</p>
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
              {uptime !== null && (
                <p className="text-xs text-gray-400 mt-1">
                  {uptime < 1 ? '✅ Activo ahora' : uptime < 60 ? `Hace ${uptime} min` : `Hace ${Math.round(uptime/60)}h`}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== MÉTRICAS RÁPIDAS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: '⚡',
            label: 'Velocidad Actual',
            value: isSmartTag && speed === 0 ? '0 km/h' : `${speed} km/h`,
            sublabel: isSmartTag ? 'Smart Tag — sin acelerómetro' : null,
            color: speed > 100 ? 'text-red-600' : speed > 60 ? 'text-orange-600' : 'text-emerald-600',
            bg: 'from-emerald-50 to-teal-50',
          },
          {
            icon: '📍',
            label: 'Ciudad',
            value: vehicle.location?.city || 'Desconocida',
            color: 'text-blue-700',
            bg: 'from-blue-50 to-indigo-50',
          },
          {
            icon: '⛽',
            label: 'Combustible',
            value: isSmartTag ? 'N/A' : (fuelLevel != null ? `${fuelLevel}%` : 'N/A'),
            sublabel: isSmartTag ? 'Smart Tag sin sensor' : null,
            color: (!isSmartTag && fuelLevel != null && fuelLevel <= 15) ? 'text-red-600' : isSmartTag ? 'text-gray-400' : 'text-purple-700',
            bg: 'from-purple-50 to-pink-50',
          },
          {
            icon: '🛣️',
            label: 'Odómetro',
            value: `${odometer.toLocaleString()} km`,
            color: 'text-slate-700',
            bg: 'from-slate-50 to-gray-50',
          },
        ].map(({ icon, label, value, sublabel, color, bg }) => (
          <div key={label} className={`bg-gradient-to-br ${bg} border border-gray-100 rounded-2xl p-4 shadow-sm`}>
            <p className="text-2xl mb-1">{icon}</p>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-lg font-black mt-1 ${color}`}>{value}</p>
            {sublabel && <p className="text-[9px] text-gray-400 mt-0.5 font-medium">{sublabel}</p>}
          </div>
        ))}
      </div>

      {/* ===== MAPA DE UBICACIÓN EN VIVO ===== */}
      <div ref={mapSectionRef} className="card p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3 px-2">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            📍 Mapa de Ubicación en Tiempo Real
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
              isAutoTracking ? 'bg-emerald-100 text-emerald-700 animate-pulse font-mono' :
              vehicle.status === 'active' ? 'bg-blue-100 text-blue-700 font-mono' : 'bg-gray-100 text-gray-600 font-mono'
            }`}>
              {isAutoTracking ? '🔴 RASTREANDO EN VIVO' : vehicle.status === 'active' ? '● En Línea' : '● ' + vehicle.status}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLocateOnMap}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl flex items-center gap-1 transition shadow-sm"
            >
              📍 Ubicar en Mapa
            </button>
            <span className="text-xs text-gray-500 font-mono hidden sm:inline">
              {isAutoTracking && liveLocationStats
                ? `${liveLocationStats.lat.toFixed(5)}, ${liveLocationStats.lng.toFixed(5)}`
                : vehicle.location?.address || 'Ubicación registrada'}
            </span>
          </div>
        </div>
        <div className="h-[420px] rounded-xl overflow-hidden border border-gray-200">
          {/* mapKey changes when location is reset, forcing full re-mount */}
          <MapComponent
            key={`map-${id}-${isAutoTracking}-${mapKey}`}
            vehicles={[mapVehicle]}
            selectedVehicle={mapVehicle}
            onVehicleSelect={() => {}}
          />
        </div>
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
              { label: 'IMEI / Tag ID', value: vehicle.deviceIMEI || 'No vinculado', mono: true },
              { label: 'SIM Card', value: vehicle.simCardNumber || 'No requiere (Smart Tag BLE)' },
              { label: 'Modelo GPS', value: vehicle.deviceModel || 'N/A' },
              { label: 'Cortacorriente', value: vehicle.motorCutStatus ? '🔒 ACTIVO' : '🟢 Normal' },
              { label: 'Última actualización', value: vehicle.lastUpdate ? new Date(vehicle.lastUpdate).toLocaleString('es-CL') : 'N/A' },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex justify-between border-b pb-2">
                <span className="text-gray-500">{label}</span>
                <span className={`font-bold text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
              </div>
            ))}

            {/* Location Management Actions */}
            <div className="pt-3 space-y-2 border-t border-gray-100 mt-2">
              <button
                onClick={handleLocateOnMap}
                className="w-full text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl py-2.5 px-4 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 text-center"
              >
                📍 Ubicar Vehículo en el Mapa
              </button>

              <button
                onClick={() => {
                  const link = `${window.location.origin}/track/${id}`
                  navigator.clipboard.writeText(link)
                  alert('¡Enlace de transmisión copiado! Puedes enviarlo por WhatsApp al conductor del vehículo.')
                }}
                className="w-full text-xs font-bold text-slate-500 hover:text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl py-1.5 px-3 transition-all flex items-center justify-center gap-2 text-center"
              >
                📋 Copiar Enlace para Conductor (Enviar por WhatsApp)
              </button>

              <button
                onClick={() => {
                  if (window.confirm('¿Borrar la ubicación guardada en la base de datos para esperar nuevo dato GPS?')) {
                    resetLocationMutation.mutate()
                  }
                }}
                disabled={resetLocationMutation.isLoading}
                className="w-full text-xs font-medium text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-xl py-1.5 px-3 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetLocationMutation.isLoading ? '⏳ Limpiando...' : '🗑️ Borrar Ubicación Guardada'}
              </button>

              {resetLocationMutation.isSuccess && (
                <p className="text-xs text-emerald-600 font-bold mt-1 text-center">✓ Ubicación borrada. Esperando nuevo reporte GPS...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== SMART TAG & GATEWAY BLE ===== */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-500/20 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-800/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/30 p-3 rounded-xl border border-indigo-400/30 text-2xl animate-pulse">
              🏷️
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-indigo-100 flex items-center gap-2">
                Simulador de GPS Móvil (Modo Gateway Celular)
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                  Transmisor Celular
                </span>
              </h2>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Usa el GPS de <strong>este dispositivo (tu teléfono/PC)</strong> para enviar coordenadas de prueba a este vehículo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggleLiveAutoTracking}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 ${
                isAutoTracking
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-900/40'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-900/30'
              }`}
            >
              {isAutoTracking ? '⏹️ Detener Transmisión Celular' : '📱 Transmitir GPS de ESTE Celular a este Vehículo'}
            </button>

            <button
              onClick={() => {
                if (!navigator.bluetooth) {
                  alert('Tu navegador no soporta Web Bluetooth. Prueba desde Google Chrome o Microsoft Edge.')
                  return
                }
                navigator.bluetooth.requestDevice({
                  acceptAllDevices: true,
                }).then(device => {
                  alert(`✅ Smart Tag detectado por Bluetooth: ${device.name || device.id}`)
                  setDeviceForm(prev => ({ ...prev, deviceIMEI: device.id || device.name }))
                }).catch(err => {
                  console.log('Bluetooth scan cancelled or error:', err)
                })
              }}
              className="px-3.5 py-2 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all border border-indigo-400/30 flex items-center gap-1.5"
            >
              📶 Escanear Tag BLE
            </button>
          </div>
        </div>

        {/* Live Tracking Status Bar */}
        {isAutoTracking && (
          <div className="space-y-2">
            {gpsAccuracyWarning ? (
              /* Waiting for GPS lock */
              <div className="bg-amber-950/80 border border-amber-500/50 rounded-xl p-3 flex items-center gap-3 text-xs">
                <span className="text-2xl animate-pulse">📡</span>
                <div>
                  <p className="font-bold text-amber-300">Buscando señal GPS de tu teléfono...</p>
                  <p className="text-amber-200/80">{gpsAccuracyWarning}</p>
                </div>
              </div>
            ) : (
              /* GPS locked and sending */
              <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <p className="font-bold text-emerald-300 text-sm">Transmitiendo GPS de tu teléfono actual → {vehicle.licensePlate}</p>
                    <p className="text-emerald-100/70 text-[11px]">
                      ⚠️ Estás enviando las coordenadas del dispositivo que sostienes en tu mano a la patente {vehicle.licensePlate}. Paquetes: <strong>{sentPacketsCount}</strong>
                    </p>
                  </div>
                </div>

                {liveLocationStats && (
                  <div className="flex flex-wrap gap-4 text-emerald-200 font-mono bg-emerald-900/40 p-2 rounded-lg border border-emerald-700/50">
                    <div>Lat: <span className="font-bold text-white">{liveLocationStats.lat.toFixed(5)}</span></div>
                    <div>Lng: <span className="font-bold text-white">{liveLocationStats.lng.toFixed(5)}</span></div>
                    <div>Vel: <span className="font-bold text-white">{liveLocationStats.speed} km/h</span></div>
                    <div>
                      Precisión: <span className={`font-bold ${liveLocationStats.accuracy <= 30 ? 'text-emerald-300' : liveLocationStats.accuracy <= 80 ? 'text-yellow-300' : 'text-orange-300'}`}>
                        ±{liveLocationStats.accuracy}m
                      </span>
                    </div>
                    <div>Hora: <span className="font-bold text-emerald-400">{liveLocationStats.time}</span></div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}


        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-indigo-100/90 pt-1">
          <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-800/40 space-y-1">
            <span className="font-bold text-emerald-400 block">1. Modo Rastreo Celular / Gateway</span>
            Al activar el botón, el GPS de <strong>este dispositivo</strong> transmitirá coordenadas <strong>solo a este vehículo</strong>. Si cambias de vehículo, deberás detener y reiniciar el rastreo.
          </div>
          <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-800/40 space-y-1">
            <span className="font-bold text-indigo-300 block">2. Vincular por Bluetooth</span>
            Usa el botón "Escanear Tag BLE" en Chrome/Edge para vincular la señal Bluetooth de tu Xtag11 directamente.
          </div>
          <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-800/40 space-y-1">
            <span className="font-bold text-blue-300 block">3. URL Webhook Automático</span>
            <button
              onClick={() => {
                const targetIMEI = vehicle.deviceIMEI || 'XTAG11-DEMO'
                const url = `https://einsoft-gp-sbcknd.vercel.app/api/sensors/upload`
                navigator.clipboard.writeText(url)
                alert('📋 URL Webhook copiada al portapapeles:\n' + url)
              }}
              className="mt-1 text-[11px] underline text-blue-300 hover:text-white font-mono block"
            >
              📋 Copiar Webhook URL para Apps
            </button>
          </div>
        </div>
      </div>


      {/* ===== VINCULAR DISPOSITIVO ===== */}
      <div className="card">
        <h2 className="card-header">Vincular Dispositivo GPS / Sensor</h2>
        <div className="p-6 text-sm">
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
            className="space-y-3 max-w-2xl"
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
      </div>
    </div>
  )
}
