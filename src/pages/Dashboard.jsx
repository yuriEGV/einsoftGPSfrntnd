import React, { useEffect, useState, useMemo } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/api'
import MapComponent from '../components/MapComponent'
import VehicleList from '../components/VehicleList'
import AlertsPanel from '../components/AlertsPanel'
import { setupSocketConnection } from '../services/socket'
import { getPersonColor } from './PeopleTracker'

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [assetTypeFilter, setAssetTypeFilter] = useState('all') // 'all' | 'vehicles' | 'people'
  const [socket, setSocket] = useState(null)
  const [realTimeData, setRealTimeData] = useState({})

  // Filter States
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = user.role === 'admin'
  const canManageFleet = user.role === 'admin' || user.role === 'fleet_manager'

  // 1. Fetch Vehicles
  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery('vehicles', async () => {
    const response = await apiClient.get('/vehicles')
    return response.data
  }, {
    refetchInterval: 5000,
  })

  // 2. Fetch People Trackers
  const { data: people = [], isLoading: loadingPeople } = useQuery('peopleTrackers', async () => {
    const response = await apiClient.get('/people-trackers')
    return response.data
  }, {
    refetchInterval: 5000,
  })

  // 3. Fetch Companies (Admin)
  const { data: companies = [] } = useQuery('companies', async () => {
    const response = await apiClient.get('/companies')
    return response.data
  }, { enabled: isAdmin })

  // 4. Fetch Alerts
  const { data: alerts = [] } = useQuery('alerts', async () => {
    const response = await apiClient.get('/alerts', { params: { limit: 10 } })
    return response.data
  }, {
    refetchInterval: 5000,
  })

  // Setup WebSocket
  useEffect(() => {
    const newSocket = setupSocketConnection()
    if (!newSocket) return
    setSocket(newSocket)

    newSocket.on('location_update', (data) => {
      setRealTimeData(prev => ({
        ...prev,
        [data.vehicleId]: data
      }))
      queryClient.invalidateQueries('vehicles')
    })

    return () => {
      if (newSocket) newSocket.disconnect()
    }
  }, [queryClient])

  // Filtered Vehicles
  const filteredVehicles = useMemo(() => {
    if (assetTypeFilter === 'people') return []
    return vehicles.filter(v => {
      if (selectedCompanyId && (v.company?._id !== selectedCompanyId && v.company !== selectedCompanyId)) return false
      if (statusFilter !== 'all' && v.status !== statusFilter) return false
      if (selectedVehicle && selectedVehicle._id !== v._id) return false
      if (selectedPerson) return false // Hide vehicles if a single person is selected
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match = v.licensePlate?.toLowerCase().includes(q) ||
                      v.make?.toLowerCase().includes(q) ||
                      v.model?.toLowerCase().includes(q) ||
                      v.deviceIMEI?.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [vehicles, assetTypeFilter, selectedCompanyId, statusFilter, selectedVehicle, selectedPerson, searchQuery])

  // Filtered People
  const filteredPeople = useMemo(() => {
    if (assetTypeFilter === 'vehicles') return []
    return people.filter(p => {
      if (selectedVehicle) return false // Hide people if a single vehicle is selected
      if (selectedPerson && selectedPerson._id !== p._id) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match = p.name?.toLowerCase().includes(q) ||
                      p.deviceId?.toLowerCase().includes(q) ||
                      p.trackerCode?.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [people, assetTypeFilter, selectedVehicle, selectedPerson, searchQuery])

  // KPI Calculations
  const activeVehiclesCount = vehicles.filter(v => v.status === 'active').length
  const activePeopleCount = people.filter(p => p.hasReportedLocation && p.status !== 'offline').length
  const totalPanicCount = people.filter(p => p.status === 'panic' || p.panicAlert?.active).length +
                          vehicles.filter(v => v.status === 'alert').length

  const handleSelectAsset = (type, item) => {
    if (type === 'vehicle') {
      setSelectedPerson(null)
      setSelectedVehicle(selectedVehicle?._id === item._id ? null : item)
    } else if (type === 'person') {
      setSelectedVehicle(null)
      setSelectedPerson(selectedPerson?._id === item._id ? null : item)
    }
  }

  const handleResetFilters = () => {
    setSelectedVehicle(null)
    setSelectedPerson(null)
    setAssetTypeFilter('all')
    setSelectedCompanyId('')
    setStatusFilter('all')
    setSearchQuery('')
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Centro de Mando Unificado
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold">
              FLOTAS & PERSONAL
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitoreo en tiempo real de vehículos de la empresa y dispositivos móviles familiares/personal de campo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/people-tracker')}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
          >
            <span>📱</span> Gestión de Móviles / SOS
          </button>
          <button
            onClick={() => navigate('/download-app')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
          >
            <span>📥</span> EYE-NODE APK
          </button>
        </div>
      </div>

      {/* ── Top Unified KPI Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vehicles KPI */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-black">
            🚗
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vehículos Flota</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{vehicles.length}</span>
              <span className="text-[11px] text-emerald-600 font-bold">({activeVehiclesCount} en ruta)</span>
            </div>
          </div>
        </div>

        {/* People / Mobile Trackers KPI */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl font-black">
            📱
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Personal / Móviles</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{people.length}</span>
              <span className="text-[11px] text-purple-600 font-bold">({activePeopleCount} en línea)</span>
            </div>
          </div>
        </div>

        {/* Active Online Total */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-black">
            🟢
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total En Línea</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">
                {activeVehiclesCount + activePeopleCount}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">/ {vehicles.length + people.length} activos</span>
            </div>
          </div>
        </div>

        {/* SOS Emergency Alerts KPI */}
        <div className={`p-4 rounded-2xl border shadow-sm flex items-center gap-3 ${
          totalPanicCount > 0
            ? 'bg-rose-50 border-rose-300 text-rose-900 animate-pulse'
            : 'bg-white border-slate-200'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black ${
            totalPanicCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            🚨
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alertas & Pánicos</p>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black ${totalPanicCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {totalPanicCount}
              </span>
              <span className="text-[11px] text-slate-500">
                {totalPanicCount > 0 ? '¡Atención Requerida!' : 'Todo Normal'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Asset Switcher & Filter Bar ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Ver Tipo:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => { setAssetTypeFilter('all'); setSelectedVehicle(null); setSelectedPerson(null); }}
                className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                  assetTypeFilter === 'all' && !selectedVehicle && !selectedPerson
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌐 Todos ({vehicles.length + people.length})
              </button>
              <button
                onClick={() => { setAssetTypeFilter('vehicles'); setSelectedPerson(null); }}
                className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                  assetTypeFilter === 'vehicles'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🚗 Vehículos ({vehicles.length})
              </button>
              <button
                onClick={() => { setAssetTypeFilter('people'); setSelectedVehicle(null); }}
                className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                  assetTypeFilter === 'people'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📱 Móviles / Personas ({people.length})
              </button>
            </div>
          </div>

          {(selectedVehicle || selectedPerson || searchQuery || selectedCompanyId) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
            >
              ✕ Restablecer Filtros
            </button>
          )}
        </div>

        {/* Individual Asset Pill Buttons for 1-Click Map Isolation */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            🎯 Filtro Individual de Activos (Haz clic para aislar en el mapa):
          </p>
          <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto">
            <button
              onClick={() => { setSelectedVehicle(null); setSelectedPerson(null); }}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition border shadow-xs ${
                !selectedVehicle && !selectedPerson
                  ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-blue-500 scale-105'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              🌐 Ver Todos Juntos
            </button>

            {/* Vehicle Pills */}
            {vehicles.map(v => {
              const isSel = selectedVehicle?._id === v._id
              return (
                <button
                  key={v._id}
                  onClick={() => handleSelectAsset('vehicle', v)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition border shadow-xs ${
                    isSel
                      ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400 scale-105'
                      : 'bg-blue-50/80 text-blue-900 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <span>🚗</span>
                  <span>{v.licensePlate}</span>
                  <span className="text-[10px] opacity-75 font-normal">({v.make})</span>
                </button>
              )
            })}

            {/* People Pills */}
            {people.map((p, idx) => {
              const isSel = selectedPerson?._id === p._id
              const colorObj = getPersonColor(p.name, idx)
              return (
                <button
                  key={p._id}
                  onClick={() => handleSelectAsset('person', p)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition border shadow-xs ${
                    isSel
                      ? 'ring-2 ring-purple-500 scale-105 text-white font-black'
                      : 'opacity-85 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isSel ? colorObj.bg : `${colorObj.stroke}15`,
                    borderColor: colorObj.stroke,
                    color: isSel ? '#ffffff' : colorObj.bg,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isSel ? '#ffffff' : colorObj.stroke }}></span>
                  <span className="capitalize">{p.name}</span>
                  <span className="text-[10px] font-mono opacity-80">({p.deviceId || p.trackerCode})</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Main Interactive Map & Sidebar Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Central Map (2 Cols) */}
        <div className="lg:col-span-2 min-h-[550px]">
          <MapComponent
            vehicles={filteredVehicles}
            selectedVehicle={selectedVehicle}
            onVehicleSelect={(v) => handleSelectAsset('vehicle', v)}
            realTimeData={realTimeData}
          />
        </div>

        {/* Right Sidebar: Fleet & People List */}
        <div className="space-y-6">
          <VehicleList
            vehicles={filteredVehicles}
            selectedVehicle={selectedVehicle}
            onVehicleSelect={(v) => handleSelectAsset('vehicle', v)}
            isLoading={loadingVehicles}
          />

          <AlertsPanel alerts={alerts} />
        </div>
      </div>
    </div>
  )
}
