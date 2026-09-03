import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiClient } from '../services/api'
import { getDeviceConnectionStatus } from '../utils/deviceState'
import {
  getRoadSnappedRoute,
  segmentPointsIntoTrips,
  getMultiSegmentSnappedRoute,
  generateDirectionChevrons,
} from '../services/routingService'
import RoutePlaybackModal from '../components/RoutePlaybackModal'

// Helper component to smoothly center Leaflet map on target person
function ChangeView({ center, zoom }) {
  const map = useMap()
  const prevCenter = useRef(null)

  useEffect(() => {
    if (!center || (center[0] === 0 && center[1] === 0)) return
    const changed = !prevCenter.current ||
      Math.abs(prevCenter.current[0] - center[0]) > 0.0001 ||
      Math.abs(prevCenter.current[1] - center[1]) > 0.0001
    if (changed) {
      map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.5 })
      prevCenter.current = center
    }
  }, [center, zoom, map])

  return null
}

// Distance helper (Haversine formula in meters)
function getDistanceMeters(p1, p2) {
  if (!p1 || !p2) return 0;
  const R = 6371e3;
  const dLat = (p2[0] - p1[0]) * Math.PI / 180;
  const dLng = (p2[1] - p1[1]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Distinct Vibrant Color Palette per Person & Trip
export const PERSON_PALETTE = {
  yuri: { stroke: '#6366f1', fill: '#818cf8', bg: '#4f46e5', badge: 'bg-indigo-600 text-white', name: 'Índigo Neón' },
  manuel: { stroke: '#10b981', fill: '#34d399', bg: '#059669', badge: 'bg-emerald-600 text-white', name: 'Esmeralda' },
  gloria: { stroke: '#f43f5e', fill: '#fb7185', bg: '#e11d48', badge: 'bg-rose-600 text-white', name: 'Rosa Carmesí' },
  sarem: { stroke: '#f59e0b', fill: '#fbbf24', bg: '#d97706', badge: 'bg-amber-500 text-white', name: 'Ámbar Oro' },
  veronica: { stroke: '#06b6d4', fill: '#22d3ee', bg: '#0891b2', badge: 'bg-cyan-600 text-white', name: 'Cian' },
};

export function getPersonColor(personName, index = 0) {
  const key = (personName || '').toLowerCase().trim();
  if (PERSON_PALETTE[key]) return PERSON_PALETTE[key];
  const list = Object.values(PERSON_PALETTE);
  return list[index % list.length];
}

// Custom Rich Person Marker with Name Badge, Status Pulse & Custom Color
function makePersonDivIcon(person, isSelected, isPanic, isOffline, index = 0) {
  const name = person.name || 'Persona';
  const battery = person.batteryLevel != null ? `${person.batteryLevel}%` : '';
  const colorObj = getPersonColor(name, index);
  const bgColor = isPanic ? '#dc2626' : isSelected ? '#7c3aed' : isOffline ? '#475569' : colorObj.bg;
  const borderRing = isSelected ? 'ring-4 ring-purple-400 ring-offset-2 scale-110 shadow-2xl z-50' : 'shadow-lg';

  const html = `
    <div class="relative flex flex-col items-center group cursor-pointer transition-all duration-300 ${borderRing}" style="transform: translate(-50%, -100%);">
      <!-- Floating Name Badge -->
      <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[11px] font-black shadow-md whitespace-nowrap mb-1" style="background-color: ${bgColor};">
        ${isPanic ? '<span class="animate-ping w-2 h-2 rounded-full bg-white"></span>' : !isOffline ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>' : ''}
        <span>👤 ${name}</span>
        ${battery ? `<span class="opacity-90 font-mono text-[9px] bg-black/20 px-1 rounded">🔋${battery}</span>` : ''}
      </div>

      <!-- Marker Pin & Radar Glow -->
      <div class="relative flex items-center justify-center">
        ${!isOffline && !isPanic ? `<div class="absolute w-8 h-8 rounded-full animate-ping" style="background-color: ${colorObj.fill}40;"></div>` : ''}
        ${isPanic ? '<div class="absolute w-10 h-10 rounded-full bg-red-500/50 animate-ping"></div>' : ''}
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow" style="background-color: ${bgColor};">
          ${isPanic ? '🚨' : isSelected ? '📍' : '👤'}
        </div>
      </div>
      <!-- Pin Pointer Triangle -->
      <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px]" style="border-t-color: ${bgColor};"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-person-marker-container',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -45],
  });
}

// Simple audio synthesizer alert for SOS Panic
function playPanicBeep() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {}
}

export default function PeopleTracker() {
  const queryClient = useQueryClient()
  const mapContainerRef = useRef(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [activeLinkModal, setActiveLinkModal] = useState(null)
  const [playbackPerson, setPlaybackPerson] = useState(null)
  const [trails, setTrails] = useState({})
  const [isCapturing, setIsCapturing] = useState(false)
  const [pingNotification, setPingNotification] = useState(null)
  const [pingingPersonId, setPingingPersonId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    deviceId: '',
    roleDescription: 'Familiar / Personal',
    assignedVehicle: '',
  })
  const [editModalPerson, setEditModalPerson] = useState(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    deviceId: '',
    roleDescription: 'Familiar / Personal',
    assignedVehicle: '',
  })
  const alarmIntervalRef = useRef(null)

  // Fetch vehicles for assignment
  const { data: vehicles = [] } = useQuery('vehiclesList', async () => {
    const res = await apiClient.get('/vehicles')
    return res.data || []
  })

  // Fetch tracked people from API
  const { data: people = [], isLoading, refetch } = useQuery('peopleTrackers', async () => {
    const res = await apiClient.get('/people-trackers')
    return res.data
  }, {
    refetchInterval: 8000,
  })

  // Referencia para evitar recargar personas ya procesadas
  const loadedPersonIds = useRef(new Set())

  // Cargar historial de cada persona INDIVIDUALMENTE para garantizar aislamiento estricto
  // (ninguna persona monopoliza el buffer ni comparte datos con otra)
  useEffect(() => {
    if (!people || people.length === 0) return

    const activepeople = people.filter(p =>
      p.hasReportedLocation &&
      p.location?.coordinates &&
      (p.location.coordinates[0] !== 0 || p.location.coordinates[1] !== 0)
    )

    activepeople.forEach(async (person) => {
      // Solo cargar una vez por persona al montar (no en cada re-render)
      if (loadedPersonIds.current.has(person._id)) return
      loadedPersonIds.current.add(person._id)

      try {
        const res = await apiClient.get(
          `/people-trackers/${person._id}/history?since=168&limit=500`
        )
        const pts = res.data || []
        if (pts.length >= 2) {
          const trips = segmentPointsIntoTrips(pts, { maxGapMinutes: 20, maxJumpMeters: 2500 })
          const snapped = await getMultiSegmentSnappedRoute(trips)
          if (snapped && snapped.length > 0) {
            setTrails(prev => ({ ...prev, [person._id]: snapped }))
          }
        } else if (pts.length === 1) {
          const lat = pts[0].gps?.latitude || pts[0].location?.coordinates?.[1]
          const lng = pts[0].gps?.longitude || pts[0].location?.coordinates?.[0]
          if (lat && lng) {
            setTrails(prev => ({ ...prev, [person._id]: [[[lat, lng]]] }))
          }
        }
      } catch (_) {
        // Silencioso — el mapa sigue funcionando sin historial de esta persona
      }
    })
  }, [people])

  // Dedicated Route Loader when a single person is selected (guarantees full route without global limit truncation)
  useEffect(() => {
    if (!selectedPerson?._id) return
    let isMounted = true

    apiClient
      .get(`/people-trackers/${selectedPerson._id}/history?since=168&limit=3000`)
      .then(async (res) => {
        if (!isMounted) return
        const pts = res.data || []
        if (pts.length >= 2) {
          const personTrips = segmentPointsIntoTrips(pts, { maxGapMinutes: 20, maxJumpMeters: 2500 })
          const snapped = await getMultiSegmentSnappedRoute(personTrips)
          if (isMounted && snapped.length > 0) {
            setTrails(prev => ({ ...prev, [selectedPerson._id]: snapped }))
          }
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [selectedPerson?._id])

  // Update live movement trails with jump filtering and road appending
  useEffect(() => {
    people.forEach(p => {
      const coords = p.location?.coordinates
      const hasRealCoords = p.hasReportedLocation && coords && (coords[0] !== 0 || coords[1] !== 0)
      if (hasRealCoords) {
        const latLng = [coords[1], coords[0]]
        setTrails(prev => {
          const personTrails = prev[p._id] || []
          // Ensure personTrails is array of segments
          const segments = Array.isArray(personTrails[0]?.[0])
            ? personTrails
            : (personTrails.length > 0 ? [personTrails] : [])

          if (segments.length === 0) {
            return { ...prev, [p._id]: [[latLng]] }
          }

          const lastSegment = segments[segments.length - 1]
          const lastPoint = lastSegment[lastSegment.length - 1]
          const dist = getDistanceMeters(lastPoint, latLng)

          // If teleportation/jump > 3km, start a new distinct segment (never draw a line across water)
          if (dist > 3000) {
            return { ...prev, [p._id]: [...segments, [latLng]] }
          }

          // If moved >= 10m, append to current segment and snap to road
          if (dist >= 10) {
            const updatedLast = [...lastSegment, latLng].slice(-300)
            const updatedSegments = [...segments.slice(0, -1), updatedLast]
            return { ...prev, [p._id]: updatedSegments }
          }
          return prev
        })
      }
    })
  }, [people])

  // Mutations
  const resetLocationMutation = useMutation(
    async (personId) => {
      const res = await apiClient.post(`/people-trackers/${personId}/reset-location`)
      return res.data
    },
    {
      onSuccess: () => {
        setTrails({})
        queryClient.invalidateQueries('peopleTrackers')
        queryClient.invalidateQueries('peopleHistoryAll')
      },
    }
  )

  // Clear movement trails permanently from database and UI
  const handleClearTrails = async () => {
    if (!window.confirm('¿Eliminar todas las trazas de movimiento de la base de datos?')) return
    try {
      const res = await apiClient.delete('/people-trackers/history/all')
      alert(`✅ ${res.data?.message || 'Historial eliminado.'}`)
    } catch (_) {}
    setTrails({})
    queryClient.invalidateQueries('peopleHistoryAll')
    queryClient.invalidateQueries('peopleTrackers')
  }

  // Purgar coordenadas inválidas / oceánicas / fuera de Chile
  const [cleaningCoords, setCleaningCoords] = useState(false)
  const handleCleanupCoords = async () => {
    if (!window.confirm('🧹 Esto eliminará todos los puntos GPS con coordenadas inválidas (fuera de Chile, en el océano, o (0,0)) y reseteará las posiciones incorrectas. ¿Continuar?')) return
    setCleaningCoords(true)
    try {
      const res = await apiClient.post('/people-trackers/cleanup-coords')
      const d = res.data?.details || {}
      alert(`✅ Limpieza completada:\n• Coords (0,0) borradas: ${d.zeroCoordsDeleted || 0}\n• Fuera de Chile borradas: ${d.outOfChileDeleted || 0}\n• Personas reseteadas: ${d.trackersReset || 0}`)
      setTrails({})
      queryClient.invalidateQueries('peopleHistoryAll')
      queryClient.invalidateQueries('peopleTrackers')
    } catch (err) {
      alert('❌ Error al limpiar: ' + (err.response?.data?.error || err.message))
    } finally {
      setCleaningCoords(false)
    }
  }

  // Screenshot map capture
  const handleCaptureScreenshot = async () => {
    if (!mapContainerRef.current) return
    try {
      setIsCapturing(true)
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
      })
      const image = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = image
      a.download = `einsoft-gps-mapa-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
    } catch (err) {
      console.error('Error capturing map:', err)
      alert('No se pudo generar la captura del mapa.')
    } finally {
      setIsCapturing(false)
    }
  }

  // Ping handler: Dispara comando de despertar remoto y espera respuesta satelital en tiempo real
  const handlePing = async (person) => {
    setPingingPersonId(person._id)
    setSelectedPerson(person)
    try {
      setPingNotification(`📡 Emitiendo comando de despertar satelital (LOCATE_NOW) a ${person.name}...`)
      await apiClient.post(`/people-trackers/${person._id}/ping`)
      await apiClient.post('/telemetry/command', {
        deviceId: person.deviceId || person.trackerCode || person.code || person._id,
        command: 'LOCATE_NOW',
        targetType: 'person',
      }).catch(() => {})

      // Polling inteligente para detectar el reporte GPS inmediato del teléfono
      let attempts = 0
      const initialTimestamp = person.location?.timestamp
      const pollInterval = setInterval(async () => {
        attempts++
        try {
          const res = await refetch()
          const updatedPeople = res.data || []
          const updated = updatedPeople.find(p => p._id === person._id)
          const hasNewCoords = updated?.hasReportedLocation &&
            updated?.location?.coordinates &&
            (updated.location.coordinates[0] !== 0 || updated.location.coordinates[1] !== 0) &&
            updated.location.timestamp !== initialTimestamp

          if (hasNewCoords) {
            clearInterval(pollInterval)
            setPingingPersonId(null)
            setSelectedPerson(updated)
            setPingNotification(`✅ ¡${person.name} localizado exitosamente en tiempo real!`)
            setTimeout(() => setPingNotification(null), 8000)
            return
          }
        } catch (_) {}

        if (attempts >= 6) {
          clearInterval(pollInterval)
          setPingingPersonId(null)
          setPingNotification(`📡 Señal de despertar transmitida a ${person.name}. Esperando reporte satelital del teléfono...`)
          setTimeout(() => setPingNotification(null), 6000)
        }
      }, 2000)
    } catch (err) {
      console.error('Error pinging person:', err)
      setPingingPersonId(null)
      setPingNotification(`⚠️ Error al emitir ping a ${person.name}.`)
      setTimeout(() => setPingNotification(null), 4000)
    }
  }

  // Check if any person is in Panic mode -> trigger alarm
  const panicCount = people.filter(p => p.status === 'panic' || p.panicAlert?.active).length

  useEffect(() => {
    if (panicCount > 0) {
      if (!alarmIntervalRef.current) {
        playPanicBeep()
        alarmIntervalRef.current = setInterval(playPanicBeep, 1200)
      }
    } else {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current)
        alarmIntervalRef.current = null
      }
    }
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current)
        alarmIntervalRef.current = null
      }
    }
  }, [panicCount])

  // Create new Person
  const createMutation = useMutation(async (data) => {
    return await apiClient.post('/people-trackers', data)
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('peopleTrackers')
      setShowAddModal(false)
      setFormData({ name: '', phone: '', deviceId: '', roleDescription: 'Familiar / Personal' })
    }
  })

  // Update existing Person & IMEI
  const updateMutation = useMutation(async ({ id, data }) => {
    return await apiClient.put(`/people-trackers/${id}`, data)
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('peopleTrackers')
      setEditModalPerson(null)
      alert('✅ Datos y número IMEI actualizados correctamente.')
    },
    onError: (err) => {
      alert('❌ Error al actualizar: ' + (err.response?.data?.error || err.message))
    }
  })

  // Toggle Admin Panic Trigger/Deactivate
  const panicMutation = useMutation(async ({ id, active }) => {
    return await apiClient.post(`/people-trackers/${id}/panic`, { active })
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('peopleTrackers')
    }
  })

  // Resolve / Silence All Panics at once
  const resolveAllPanicsMutation = useMutation(async () => {
    return await apiClient.post('/people-trackers/panic/resolve-all')
  }, {
    onSuccess: () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current)
        alarmIntervalRef.current = null
      }
      queryClient.invalidateQueries('peopleTrackers')
      refetch()
    }
  })

  // Delete Person
  const deleteMutation = useMutation(async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar a esta persona de la lista de rastreo?')) return;
    return await apiClient.delete(`/people-trackers/${id}`)
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('peopleTrackers')
    }
  })


  const handleSubmitAdd = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return alert('Por favor ingresa un nombre.')
    createMutation.mutate(formData)
  }

  // Calculate default map center (Default to Valparaíso if no valid reported positions)
  const validLocations = people.filter(p => {
    const coords = p.location?.coordinates;
    if (!p.hasReportedLocation || !coords || !Array.isArray(coords)) return false;
    const lng = coords[0], lat = coords[1];
    return (lat !== 0 || lng !== 0) &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180 &&
      lng > -76; // Not in the Pacific Ocean west of Chile
  });
  const defaultCenter = validLocations.length > 0
    ? [validLocations[0].location.coordinates[1], validLocations[0].location.coordinates[0]]
    : [-33.045, -71.615] // Default Valparaíso, Chile

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner (Purple Theme for Personal Tracking) ── */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-purple-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-bold uppercase tracking-wider mb-2">
              📱 Servicio Exclusivo: Personas y Celulares
            </div>
            <h1 className="text-2xl md:text-3xl font-black italic tracking-tight">
              Rastreo Personal y Sistema SOS
            </h1>
            <p className="text-purple-200/80 text-sm mt-1 max-w-2xl">
              Monitoreo en tiempo real de familiares, personal de campo y adultos mayores. Incluye **Botón de Pánico Instantáneo** independiente del sistema vehicular.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <span>➕</span> Agregar Persona a Rastrear
          </button>
        </div>

        {/* Banner de alerta si hay alguien en pánico */}
        {panicCount > 0 && (
          <div className="mt-4 p-4 bg-gradient-to-r from-red-600 to-rose-700 border-2 border-white/40 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-pulse shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-bounce">🚨</span>
              <div>
                <p className="font-black text-sm uppercase tracking-wide">¡ALERTA DE EMERGENCIA ACTIVADA EN TIEMPO REAL!</p>
                <p className="text-xs text-red-100 font-medium">Hay {panicCount} persona(s) solicitando auxilio inmediato con el Botón de Pánico SOS.</p>
              </div>
            </div>

            <button
              onClick={() => resolveAllPanicsMutation.mutate()}
              disabled={resolveAllPanicsMutation.isLoading}
              className="px-4 py-2.5 bg-white hover:bg-red-50 text-red-700 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center gap-2 hover:shadow-xl"
              title="Apagar sirena acústica y resolver todas las alertas de pánico activas"
            >
              <span>🔕</span>
              <span>{resolveAllPanicsMutation.isLoading ? 'Apagando...' : 'Apagar y Silenciar Alarma'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Main Layout: Cards + Map ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: People Cards List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              👥 Personas Registradas ({people.length})
            </h2>
            {isLoading && <span className="text-xs text-purple-600 animate-pulse font-medium">Cargando...</span>}
          </div>

          {people.length === 0 && !isLoading && (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm space-y-3">
              <span className="text-4xl">📱</span>
              <h3 className="font-bold text-slate-700">No hay personas registradas</h3>
              <p className="text-xs text-slate-500">Agrega a tu primera persona para obtener el enlace de rastreo en su celular y su botón de pánico.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition"
              >
                + Registrar Persona
              </button>
            </div>
          )}

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {people.map((person) => {
              const isPanic = person.status === 'panic' || person.panicAlert?.active;
              const isSelected = selectedPerson?._id === person._id;
              const coords = person.location?.coordinates || [0, 0];
              const lat = coords[1];
              const lng = coords[0];
              // Strict validation: must have location, hasReportedLocation, non-zero coords,
              // and coords must be within reasonable bounds (not in the ocean or default values)
              const hasRealCoords = Boolean(
                person.hasReportedLocation &&
                person.location?.coordinates &&
                lat && lng &&
                (lat !== 0 || lng !== 0) &&
                lat >= -90 && lat <= 90 &&
                lng >= -180 && lng <= 180 &&
                // Reject Santiago default coords (common fallback)
                !(Math.abs(lat - (-33.45694)) < 0.001 && Math.abs(lng - (-70.64827)) < 0.001) &&
                // Reject Pacific Ocean coords (west of Chilean coast lon < -76)
                lng > -76
              );

              const publicUrl = `${window.location.origin}/person-track/${person.trackerCode}`;

              return (
                <div
                  key={person._id}
                  onClick={() => setSelectedPerson(person)}
                  className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer relative shadow-sm ${
                    isPanic
                      ? 'border-red-500 bg-red-50/50 shadow-md shadow-red-500/10 ring-2 ring-red-500/30'
                      : isSelected
                      ? 'border-purple-600 ring-2 ring-purple-500/20'
                      : 'border-slate-200 hover:border-purple-300'
                  }`}
                >
                  {/* Status Tag */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-base">{person.name}</h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {person.roleDescription}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">📞 {person.phone || 'Sin número de contacto'}</p>
                    </div>

                    {isPanic ? (
                      <span className="px-3 py-1.5 bg-red-600 text-white text-xs font-extrabold rounded-full animate-bounce shadow">
                        🚨 PÁNICO SOS
                      </span>
                    ) : (
                      (() => {
                        // Connection status based strictly on the GPS satellite location timestamp
                        const conn = getDeviceConnectionStatus(person.location?.timestamp)
                        return (
                          <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full flex items-center gap-1 ${conn.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${conn.dotClass}`}></span>
                            {conn.label}
                          </span>
                        )
                      })()
                    )}
                  </div>

                  {/* Battery & Stats */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 mb-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Batería Celular</span>
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        {person.hasReportedLocation && person.batteryLevel != null
                          ? `🔋 ${person.batteryLevel}%`
                          : '🔋 Sin datos'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Precisión GPS</span>
                      <span className="font-bold text-slate-700">
                        🎯 {hasRealCoords ? (person.gpsAccuracy ? `±${Math.round(person.gpsAccuracy)}m` : 'Alta') : 'Sin señal'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Velocidad</span>
                      <span className="font-bold text-slate-700">
                        🏃 {Math.round(person.speed || 0)} km/h
                      </span>
                    </div>
                  </div>

                  {/* IMEI & Hardware Tag & Assigned Vehicle */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 mb-3 flex items-center justify-between text-[11px] font-mono flex-wrap gap-1">
                    <span className="text-slate-700 font-bold">
                      📱 IMEI: <span className="text-purple-700 font-black">{person.deviceId || 'Sin IMEI asignado'}</span>
                    </span>
                    {person.assignedVehicle ? (
                      <span className="bg-blue-100 text-blue-800 font-sans font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                        🚗 {typeof person.assignedVehicle === 'object' ? `${person.assignedVehicle.licensePlate} (${person.assignedVehicle.make || ''})` : 'Auto Asignado'}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">
                        🔑 {person.trackerCode}
                      </span>
                    )}
                  </div>

                  {/* Location string or Initial Warning */}
                  {!hasRealCoords ? (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 mb-3 text-xs space-y-1.5">
                      <div className="flex items-center gap-1 font-extrabold text-amber-800">
                        <span>⚠️</span> Esperando conexión GPS del teléfono
                      </div>
                      <p className="text-[11px] text-amber-700 leading-tight">
                        Para activar la posición real en el mapa, abre el enlace en el smartphone de {person.name} o presiona el botón a continuación:
                      </p>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <p className="text-xs text-slate-700 truncate">
                        📍 <span className="font-semibold">{person.location?.address || 'Ubicación reportada'}</span>
                      </p>
                      {person.location?.timestamp && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          🕒 Reporte satelital: {new Date(person.location.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ({new Date(person.location.timestamp).toLocaleDateString('es-CL')})
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveLinkModal(person)
                      }}
                      className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      📱 Abrir en Celular / QR
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePing(person)
                      }}
                      disabled={pingingPersonId === person._id}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                      title="Forzar actualización GPS del dispositivo"
                    >
                      {pingingPersonId === person._id ? (
                        <>
                          <span className="animate-spin text-sm">📡</span> Despertando GPS...
                        </>
                      ) : (
                        <>
                          <span>📍</span> Localizar / Ping
                        </>
                      )}
                    </button>

                    {/* Playback GPS Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setPlaybackPerson(person)
                      }}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition border border-indigo-200 shadow-xs"
                      title="Reproducir recorrido histórico y ver ruta en el mapa (Playback GPS)"
                    >
                      <span>🎬</span> Recorrido
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditModalPerson(person)
                        setEditFormData({
                          name: person.name || '',
                          phone: person.phone || '',
                          deviceId: person.deviceId || '',
                          roleDescription: person.roleDescription || 'Familiar / Personal',
                          assignedVehicle: person.assignedVehicle?._id || person.assignedVehicle || '',
                        })
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                      title="Editar datos e IMEI de esta persona"
                    >
                      ✏️ Editar
                    </button>

                    {/* Panic Toggle button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        panicMutation.mutate({ id: person._id, active: !isPanic })
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        isPanic
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-red-600 text-white hover:bg-red-700 shadow shadow-red-600/30'
                      }`}
                    >
                      {isPanic ? '✅ Cancelar Alarma' : '🚨 Probar Pánico'}
                    </button>

                    {hasRealCoords && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm(`¿Deseas limpiar la ubicación y ruta antigua de ${person.name}?`)) {
                            resetLocationMutation.mutate(person._id)
                          }
                        }}
                        disabled={resetLocationMutation.isLoading}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1 transition shadow-xs"
                        title="Limpiar ubicación y traza antigua del mapa y esperar señal nueva en vivo"
                      >
                        <span>🧹</span> Limpiar Ruta
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMutation.mutate(person._id)
                      }}
                      className="text-slate-400 hover:text-red-600 p-1 text-xs"
                      title="Eliminar registro"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Live Map */}
        <div className="lg:col-span-7">
          <div ref={mapContainerRef} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm h-[600px] flex flex-col">
            {pingNotification && (
              <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <span>🛰️</span>
                <span>{pingNotification}</span>
              </div>
            )}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                🗺️ Mapa de Ubicación en Tiempo Real
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleCleanupCoords}
                  disabled={cleaningCoords}
                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl flex items-center gap-1 transition border border-red-200 shadow-sm disabled:opacity-50"
                  title="Purgar coordenadas GPS inválidas, oceánicas o fuera de Chile de la base de datos"
                >
                  {cleaningCoords ? '🔄 Limpiando...' : '🛡️ Limpiar GPS Corrupto'}
                </button>
                <button
                  onClick={handleClearTrails}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition border border-slate-200 shadow-sm"
                  title="Limpiar líneas de recorrido y trazas del mapa"
                >
                  🧹 Limpiar Trazas
                </button>
                <button
                  onClick={handleCaptureScreenshot}
                  disabled={isCapturing}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition shadow-sm shadow-blue-500/20 disabled:opacity-50"
                  title="Guardar imagen / captura de pantalla del mapa actual"
                >
                  {isCapturing ? '📸 Capturando...' : '📸 Capturar Mapa'}
                </button>
                <button
                  onClick={() => refetch()}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition shadow-sm"
                  title="Refrescar posiciones de mapa"
                >
                  🔄 Refrescar
                </button>
              </div>
            </div>

            {/* Color Legend Bar per Person & Trail */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 text-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 mr-1 flex items-center gap-1">
                <span>🎨</span> Filtro:
              </span>
              <button
                onClick={() => setSelectedPerson(null)}
                className={`px-3 py-1 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition border shadow-xs ${
                  !selectedPerson
                    ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-purple-500 scale-105'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <span>🌐</span>
                <span>Ver Todos ({people.length})</span>
              </button>

              {people.map((p, idx) => {
                const color = getPersonColor(p.name, idx);
                const isSelected = selectedPerson?._id === p._id;
                return (
                  <button
                    key={p._id}
                    onClick={() => setSelectedPerson(isSelected ? null : p)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition border shadow-xs ${
                      isSelected ? 'ring-2 ring-purple-500 scale-105 font-black' : 'opacity-85 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: isSelected ? color.bg : `${color.stroke}15`,
                      borderColor: color.stroke,
                      color: isSelected ? '#ffffff' : color.bg,
                    }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: isSelected ? '#ffffff' : color.stroke }}></span>
                    <span className="capitalize">{p.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 rounded-xl overflow-hidden relative border border-slate-100">
              <MapContainer
                center={defaultCenter}
                zoom={13}
                className="h-full w-full"
              >
                <ChangeView
                  center={
                    selectedPerson?.location?.coordinates &&
                    (selectedPerson.location.coordinates[0] !== 0 || selectedPerson.location.coordinates[1] !== 0)
                      ? [selectedPerson.location.coordinates[1], selectedPerson.location.coordinates[0]]
                      : defaultCenter
                  }
                  zoom={selectedPerson ? 16 : 13}
                />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Render Distinct Multi-Color Trajectory Polyline Trails per Person */}
                {Object.entries(trails).map(([personId, trailData], trailIdx) => {
                  if (!trailData || trailData.length === 0) return null
                  if (selectedPerson && selectedPerson._id !== personId) return null

                  const isSel = selectedPerson?._id === personId
                  const personObj = people.find(p => p._id === personId)
                  const colorObj = getPersonColor(personObj?.name, trailIdx)

                  // Normalizar a lista de tramos viales independientes
                  const segments = Array.isArray(trailData[0]?.[0]) ? trailData : [trailData]

                  return (
                    <React.Fragment key={`trail-frag-${personId}`}>
                      {segments.map((seg, segIdx) => {
                        if (!seg || seg.length < 2) return null
                        const startPoint = seg[0]
                        const endPoint = seg[seg.length - 1]
                        const chevrons = generateDirectionChevrons(seg, 350)

                        return (
                          <React.Fragment key={`trail-seg-${personId}-${segIdx}`}>
                            {/* Segment Polyline (Vial, 0% Mar) */}
                            <Polyline
                              positions={seg}
                              pathOptions={{
                                color: colorObj.stroke,
                                weight: isSel ? 7 : 5,
                                opacity: isSel ? 1 : 0.85,
                                lineCap: 'round',
                                lineJoin: 'round',
                              }}
                            />

                            {/* Direction Chevrons (Flechas de Sentido de Avance) */}
                            {chevrons.map((ch, cIdx) => (
                              <Marker
                                key={`chev-${personId}-${segIdx}-${cIdx}`}
                                position={ch.position}
                                icon={L.divIcon({
                                  html: `
                                    <div style="transform: rotate(${ch.bearing}deg);" class="w-3.5 h-3.5 flex items-center justify-center drop-shadow select-none pointer-events-none opacity-90 text-white">
                                      <svg viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3">
                                        <path d="M12 2L2 22l10-4 10 4L12 2z"/>
                                      </svg>
                                    </div>
                                  `,
                                  className: '',
                                  iconSize: [14, 14],
                                  iconAnchor: [7, 7],
                                })}
                                interactive={false}
                              />
                            ))}

                            {/* Start Point Marker (🟢 Inicio de Tramo) */}
                            {isSel && (
                              <Marker
                                position={startPoint}
                                icon={L.divIcon({
                                  html: `<div class="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[9px] font-extrabold shadow-md border border-white whitespace-nowrap" style="background-color: ${colorObj.bg}">🟢 Inicio ${segments.length > 1 ? `T${segIdx + 1}` : ''} ${personObj?.name || ''}</div>`,
                                  className: '',
                                  iconSize: [0, 0],
                                  iconAnchor: [30, 10],
                                })}
                              />
                            )}

                            {/* End Point Marker (🏁 Fin de Tramo) si no es el actual en movimiento */}
                            {isSel && segments.length > 1 && segIdx < segments.length - 1 && (
                              <Marker
                                position={endPoint}
                                icon={L.divIcon({
                                  html: `<div class="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[9px] font-extrabold shadow-md border border-white whitespace-nowrap bg-rose-600">🏁 Fin T${segIdx + 1}</div>`,
                                  className: '',
                                  iconSize: [0, 0],
                                  iconAnchor: [25, 10],
                                })}
                              />
                            )}
                          </React.Fragment>
                        )
                      })}
                    </React.Fragment>
                  )
                })}

                {/* Render Markers for People with Real GPS Location (Isolate if single person selected) */}
                {(selectedPerson ? [selectedPerson] : people).map((person, pIdx) => {
                  const coords = person.location?.coordinates;
                  const hasRealLocation = person.hasReportedLocation && coords && (coords[0] !== 0 || coords[1] !== 0);
                  if (!hasRealLocation) return null;

                  const isPanic = person.status === 'panic' || person.panicAlert?.active;
                  const isOffline = person.status === 'offline';
                  const isSelected = selectedPerson?._id === person._id;
                  const conn = getDeviceConnectionStatus(person.location?.timestamp);
                  const colorObj = getPersonColor(person.name, pIdx);
                  const pos = [coords[1], coords[0]];

                  return (
                    <Marker
                      key={`${person._id}-${isSelected}-${pos[0]}-${pos[1]}`}
                      position={pos}
                      icon={makePersonDivIcon(person, isSelected, isPanic, isOffline, pIdx)}
                      eventHandlers={{
                        click: () => setSelectedPerson(person),
                      }}
                      zIndexOffset={isPanic ? 3000 : isSelected ? 2000 : 1000}
                    >
                      <Popup minWidth={240}>
                        <div className="p-2 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between border-b pb-1">
                            <p className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: colorObj.stroke }}></span>
                              👤 {person.name}
                            </p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${conn.badgeClass}`}>
                              {conn.label}
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium">{person.roleDescription}</p>
                          <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1.5 rounded-lg text-[11px]">
                            <p className="font-semibold text-purple-700">🔋 Batería: {person.batteryLevel ?? 100}%</p>
                            <p className="font-semibold text-slate-700">🏃 Vel: {Math.round(person.speed || 0)} km/h</p>
                            <p className="font-semibold text-slate-700 col-span-2">🎯 Precisión: {person.gpsAccuracy ? `±${Math.round(person.gpsAccuracy)}m` : 'Alta'}</p>
                          </div>
                          <p className="text-[11px] text-slate-500 pt-0.5">
                            📍 {person.location?.address || `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`}
                          </p>
                          {person.location?.timestamp && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              🕒 Satélite: {new Date(person.location.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} ({new Date(person.location.timestamp).toLocaleDateString('es-CL')})
                            </p>
                          )}
                          {isPanic && (
                            <p className="font-extrabold text-red-600 bg-red-50 p-1.5 rounded-lg text-center animate-pulse">
                              🚨 ¡ALERTA PÁNICO ACTIVADA!
                            </p>
                          )}
                          <div className="flex gap-1.5 pt-1">
                            {hasRealLocation && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`¿Deseas limpiar la ubicación antigua registrada de ${person.name}?`)) {
                                    resetLocationMutation.mutate(person._id);
                                  }
                                }}
                                className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] text-center border border-slate-200"
                              >
                                🧹 Limpiar
                              </button>
                            )}
                            <a
                              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                `🚨 Ubicación GPS de ${person.name} en EINSoft GPS: https://einsoft-gp-sfrntnd.vercel.app/people-tracker`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] text-center shadow"
                            >
                              📲 Compartir
                            </a>
                          </div>
                          <button
                            onClick={() => setPlaybackPerson(person)}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] text-center shadow flex items-center justify-center gap-1 mt-1"
                          >
                            🎬 Ver Recorrido Histórico (Playback)
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Agregar Persona ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                📱 Registrar Nueva Persona
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre Completo del Titular
                </label>
                <input
                  type="text"
                  placeholder="Ej: Manuel Valenzuela / Guardia Central"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Teléfono Móvil de Contacto
                </label>
                <input
                  type="text"
                  placeholder="Ej: +56989998916"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    📱 Identificador del Móvil / Tracker
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deviceId: `MOVIL-${Math.floor(1000 + Math.random() * 9000)}` })}
                    className="text-[10px] text-purple-700 font-bold bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-lg transition"
                  >
                    🎲 Generar ID MOVIL
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Ej: MOVIL-3550 o IMEI de 15 dígitos"
                  value={formData.deviceId || ''}
                  onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono font-bold text-slate-900 bg-slate-50/50"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Identificador asignado al teléfono para enlazar y recibir su telemetría en tiempo real.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Rol / Tipo de Asignación
                </label>
                <select
                  value={formData.roleDescription}
                  onChange={(e) => setFormData({ ...formData, roleDescription: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium text-slate-800"
                >
                  <option value="Empresa / Conductor de Flota">Empresa / Conductor de Flota</option>
                  <option value="Trabajador de Campo / Guardia">Trabajador de Campo / Guardia</option>
                  <option value="Repartidor / Ejecutivo">Repartidor / Ejecutivo</option>
                  <option value="Familiar / Personal">Familiar / Personal</option>
                  <option value="Adulto Mayor">Adulto Mayor</option>
                  <option value="Hijo / Estudiante">Hijo / Estudiante</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  🚗 Vehículo Asignado (Opcional)
                </label>
                <select
                  value={formData.assignedVehicle || ''}
                  onChange={(e) => setFormData({ ...formData, assignedVehicle: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium text-slate-800"
                >
                  <option value="">-- Sin vehículo asignado (Solo celular) --</option>
                  {vehicles.map(v => (
                    <option key={v._id} value={v._id}>
                      🚗 {v.licensePlate} ({v.make || ''} {v.model || ''})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Al vincular un auto, los reportes GPS de este celular también moverán el vehículo en el mapa.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition shadow-lg shadow-purple-600/30 text-sm"
                >
                  {createMutation.isLoading ? 'Guardando...' : 'Generar Móvil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Persona & Identificador ── */}
      {editModalPerson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                ✏️ Modificar Ficha del Móvil
              </h3>
              <button
                onClick={() => setEditModalPerson(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateMutation.mutate({ id: editModalPerson._id, data: editFormData })
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre Completo del Titular
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Teléfono Móvil de Contacto
                </label>
                <input
                  type="text"
                  placeholder="Ej: +56989998916"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    📱 Identificador del Móvil / Tracker
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, deviceId: `MOVIL-${Math.floor(1000 + Math.random() * 9000)}` })}
                    className="text-[10px] text-purple-700 font-bold bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-lg transition"
                  >
                    🎲 Generar ID MOVIL
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Ej: MOVIL-3550 o IMEI de 15 dígitos"
                  value={editFormData.deviceId}
                  onChange={(e) => setEditFormData({ ...editFormData, deviceId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono font-bold text-purple-900 bg-purple-50/40"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Identificador con el que la APK del celular transmite a la plataforma central.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Rol / Tipo de Asignación
                </label>
                <select
                  value={editFormData.roleDescription}
                  onChange={(e) => setEditFormData({ ...editFormData, roleDescription: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium text-slate-800"
                >
                  <option value="Empresa / Conductor de Flota">Empresa / Conductor de Flota</option>
                  <option value="Trabajador de Campo / Guardia">Trabajador de Campo / Guardia</option>
                  <option value="Repartidor / Ejecutivo">Repartidor / Ejecutivo</option>
                  <option value="Familiar / Personal">Familiar / Personal</option>
                  <option value="Adulto Mayor">Adulto Mayor</option>
                  <option value="Hijo / Estudiante">Hijo / Estudiante</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  🚗 Vehículo Asignado (Opcional)
                </label>
                <select
                  value={editFormData.assignedVehicle || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, assignedVehicle: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium text-slate-800"
                >
                  <option value="">-- Sin vehículo asignado (Solo celular) --</option>
                  {vehicles.map(v => (
                    <option key={v._id} value={v._id}>
                      🚗 {v.licensePlate} ({v.make || ''} {v.model || ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditModalPerson(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-purple-600/30 text-sm"
                >
                  {updateMutation.isLoading ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Enlace & QR para Smartphone de la Persona ── */}
      {activeLinkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  📱 Activar en el Teléfono de {activeLinkModal.name}
                </h3>
                <p className="text-xs text-slate-500">Abre este enlace en su smartphone para transmitir su GPS y usar el Botón de Pánico.</p>
              </div>
              <button
                onClick={() => setActiveLinkModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 text-center space-y-3">
              <p className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                Enlace Táctico EYE-NODE 360 (Directo en Backend)
              </p>
              <input
                type="text"
                readOnly
                value={`https://einsoft-gp-sbcknd.vercel.app/eyenode?id=${encodeURIComponent(activeLinkModal.deviceId || activeLinkModal.trackerCode)}&code=${encodeURIComponent(activeLinkModal.trackerCode)}`}
                className="w-full text-xs p-3 bg-white rounded-xl border border-purple-300 font-mono text-purple-900 select-all text-center"
              />

              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://einsoft-gp-sbcknd.vercel.app/eyenode?id=${encodeURIComponent(activeLinkModal.deviceId || activeLinkModal.trackerCode)}&code=${encodeURIComponent(activeLinkModal.trackerCode)}`)
                    alert('¡Enlace táctico EYE-NODE copiado al portapapeles!')
                  }}
                  className="px-4 py-2 bg-cyan-600 text-white text-xs font-bold rounded-xl hover:bg-cyan-700 shadow"
                >
                  📋 Copiar Enlace EYE-NODE
                </button>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `Hola ${activeLinkModal.name}, abre este enlace en tu celular para activar tu Nodo Táctico EYE-NODE 360 con transmisión continua cada 5 min y botón SOS: https://einsoft-gp-sbcknd.vercel.app/eyenode?id=${encodeURIComponent(activeLinkModal.deviceId || activeLinkModal.trackerCode)}&code=${encodeURIComponent(activeLinkModal.trackerCode)}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shadow flex items-center gap-1"
                >
                  📲 Enviar por WhatsApp
                </a>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => setActiveLinkModal(null)}
                className="px-6 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl text-xs hover:bg-slate-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Reproductor de Recorrido Histórico (Playback GPS) ── */}
      {playbackPerson && (
        <RoutePlaybackModal
          isOpen={!!playbackPerson}
          onClose={() => setPlaybackPerson(null)}
          targetType="person"
          targetId={playbackPerson._id}
          targetName={`👤 ${playbackPerson.name} (${playbackPerson.deviceId || playbackPerson.trackerCode})`}
        />
      )}
    </div>
  )
}
