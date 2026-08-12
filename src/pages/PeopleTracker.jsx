import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiClient } from '../services/api'

// Custom Person Markers
function makePersonIcon(isPanic, isOffline) {
  const size = isPanic ? 40 : 32;
  const color = isPanic ? '#ef4444' : isOffline ? '#6b7280' : '#8b5cf6'; // Purple for normal, red for panic
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">
      ${isPanic ? '<circle cx="18" cy="18" r="17" fill="#ef4444" opacity="0.3"><animate attributeName="r" values="14;18;14" dur="1s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0.1;0.5" dur="1s" repeatCount="indefinite"/></circle>' : ''}
      <circle cx="18" cy="12" r="7" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <path d="M6 32c0-6.6 5.4-12 12-12s12 5.4 12 12" fill="${color}" stroke="#ffffff" stroke-width="2"/>
    </svg>
  `);
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Simple audio synthesizer alert for SOS Panic
function playPanicBeep() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

export default function PeopleTracker() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [activeLinkModal, setActiveLinkModal] = useState(null)
  const [formData, setFormData] = useState({ name: '', phone: '', roleDescription: 'Familiar / Personal' })
  const alarmIntervalRef = useRef(null)

  // Fetch tracked people
  const { data: people = [], isLoading, refetch } = useQuery('peopleTrackers', async () => {
    const res = await apiClient.get('/people-trackers')
    return res.data
  }, {
    refetchInterval: 4000, // Poll every 4 seconds for live location & panic updates
  })

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
      setFormData({ name: '', phone: '', roleDescription: 'Familiar / Personal' })
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

  // Calculate default map center
  const validLocations = people.filter(p => p.location?.coordinates && p.location.coordinates[0] !== 0)
  const defaultCenter = validLocations.length > 0
    ? [validLocations[0].location.coordinates[1], validLocations[0].location.coordinates[0]]
    : [-33.45694, -70.64827] // Santiago default

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
          <div className="mt-4 p-4 bg-red-600/90 border border-red-400 text-white rounded-2xl flex items-center justify-between animate-pulse shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <p className="font-extrabold text-sm uppercase">¡ALERTA DE EMERGENCIA ACTIVADA!</p>
                <p className="text-xs opacity-90">Hay {panicCount} persona(s) solicitando auxilio inmediato con el Botón de Pánico.</p>
              </div>
            </div>
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
                      <span className="px-3 py-1 bg-red-600 text-white text-xs font-extrabold rounded-full animate-bounce shadow">
                        🚨 PÁNICO SOS
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                        🟢 Normal
                      </span>
                    )}
                  </div>

                  {/* Battery & Stats */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 mb-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Batería Celular</span>
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        🔋 {person.batteryLevel ?? 100}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Precisión GPS</span>
                      <span className="font-bold text-slate-700">
                        🎯 {person.gpsAccuracy ? `±${Math.round(person.gpsAccuracy)}m` : 'Baja'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Velocidad</span>
                      <span className="font-bold text-slate-700">
                        🏃 {Math.round(person.speed || 0)} km/h
                      </span>
                    </div>
                  </div>

                  {/* Location string */}
                  <p className="text-xs text-slate-600 mb-3 truncate">
                    📍 <span className="font-medium">{person.location?.address || 'Ubicación reportada'}</span>
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveLinkModal(person)
                      }}
                      className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      📱 Abrir en Celular / QR
                    </button>

                    {lat && lng && (
                      <a
                        href={`https://maps.google.com/?q=${lat},${lng}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        🗺️ Google Maps
                      </a>
                    )}

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

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMutation.mutate(person._id)
                      }}
                      className="text-slate-400 hover:text-red-600 p-1 text-xs"
                      title="Eliminar"
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
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                🗺️ Mapa de Ubicación en Tiempo Real
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Actualización automática cada 4s
              </span>
            </div>

            <div className="flex-1 rounded-xl overflow-hidden relative border border-slate-100">
              <MapContainer
                center={defaultCenter}
                zoom={13}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {people.map((person) => {
                  const coords = person.location?.coordinates;
                  if (!coords || (coords[0] === 0 && coords[1] === 0)) return null;
                  const isPanic = person.status === 'panic' || person.panicAlert?.active;
                  const isOffline = person.status === 'offline';

                  return (
                    <Marker
                      key={person._id}
                      position={[coords[1], coords[0]]}
                      icon={makePersonIcon(isPanic, isOffline)}
                    >
                      <Popup>
                        <div className="p-1 space-y-1 text-xs">
                          <p className="font-bold text-sm text-slate-900">{person.name}</p>
                          <p className="text-slate-600">{person.roleDescription}</p>
                          <p className="font-semibold text-purple-700">🔋 Batería: {person.batteryLevel}%</p>
                          {isPanic && (
                            <p className="font-extrabold text-red-600 bg-red-50 p-1 rounded">
                              🚨 ¡ALERTA PÁNICO ACTIVADA!
                            </p>
                          )}
                          <a
                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                              `🚨 Ubicación SOS de ${person.name}: https://maps.google.com/?q=${coords[1]},${coords[0]}`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block mt-2 px-2 py-1 bg-emerald-600 text-white font-bold rounded text-[11px]"
                          >
                            📲 Compartir WhatsApp SOS
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  )
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
                  Nombre Completo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez / Abuela María"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Teléfono Móvil
                </label>
                <input
                  type="text"
                  placeholder="Ej: +56912345678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Rol o Relación
                </label>
                <select
                  value={formData.roleDescription}
                  onChange={(e) => setFormData({ ...formData, roleDescription: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                >
                  <option value="Familiar / Personal">Familiar / Personal</option>
                  <option value="Hijo / Estudiante">Hijo / Estudiante</option>
                  <option value="Adulto Mayor">Adulto Mayor</option>
                  <option value="Trabajador de Campo / Guardia">Trabajador de Campo / Guardia</option>
                  <option value="Repartidor / Ejecutivo">Repartidor / Ejecutivo</option>
                </select>
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
                  className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition shadow-lg shadow-purple-600/30 text-sm"
                >
                  {createMutation.isLoading ? 'Guardando...' : 'Generar Rastreador'}
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
                Enlace Directo de Pánico y Rastreo
              </p>
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/person-track/${activeLinkModal.trackerCode}`}
                className="w-full text-xs p-3 bg-white rounded-xl border border-purple-300 font-mono text-purple-900 select-all text-center"
              />

              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/person-track/${activeLinkModal.trackerCode}`)
                    alert('¡Enlace copiado al portapapeles!')
                  }}
                  className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 shadow"
                >
                  📋 Copiar Enlace
                </button>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `Hola ${activeLinkModal.name}, abre este enlace en tu celular para activar tu Rastreador y Botón de Pánico SOS: ${window.location.origin}/person-track/${activeLinkModal.trackerCode}`
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
    </div>
  )
}
