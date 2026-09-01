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
  const canViewCompanies = ['superadmin', 'admin', 'supervisor', 'fleet_manager', 'auditor'].includes(user.role)

  // 1. Fetch Vehicles
  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery('vehicles', async () => {
    const response = await apiClient.get('/vehicles')
    return response.data || []
  }, {
    refetchInterval: 5000,
  })

  // 2. Fetch People Trackers
  const { data: people = [], isLoading: loadingPeople } = useQuery('peopleTrackers', async () => {
    const response = await apiClient.get('/people-trackers')
    return response.data || []
  }, {
    refetchInterval: 12000,
  })

  // 3. Fetch Companies (Admin / Superadmin / Supervisor)
  const { data: companies = [] } = useQuery('companies', async () => {
    try {
      const response = await apiClient.get('/companies')
      return response.data || []
    } catch (_) {
      return []
    }
  }, { enabled: canViewCompanies, staleTime: 300000 })

  // 4. Fetch Alerts
  const { data: alerts = [] } = useQuery('alerts', async () => {
    const response = await apiClient.get('/alerts', { params: { limit: 50 } })
    return response.data || []
  }, {
    refetchInterval: 15000,
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

    newSocket.on('person_location_update', () => {
      queryClient.invalidateQueries('peopleTrackers')
    })

    newSocket.on('person_panic_alert', () => {
      queryClient.invalidateQueries('peopleTrackers')
      queryClient.invalidateQueries('alerts')
    })

    newSocket.on('alerts_acknowledged', () => {
      queryClient.invalidateQueries('alerts')
      queryClient.invalidateQueries('peopleTrackers')
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
      if (selectedCompanyId) {
        const vCompId = (typeof v.company === 'object' ? v.company?._id : v.company)?.toString()
        if (vCompId !== selectedCompanyId) return false
      }
      if (statusFilter !== 'all' && v.status !== statusFilter) return false
      if (selectedVehicle && selectedVehicle._id !== v._id) return false
      if (selectedPerson) return false // Hide vehicles if a single person is selected
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match = v.licensePlate?.toLowerCase().includes(q) ||
                      v.make?.toLowerCase().includes(q) ||
                      v.model?.toLowerCase().includes(q) ||
                      v.deviceIMEI?.toLowerCase().includes(q) ||
                      v.assignedPerson?.name?.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [vehicles, assetTypeFilter, selectedCompanyId, statusFilter, selectedVehicle, selectedPerson, searchQuery])

  // Filtered People
  const filteredPeople = useMemo(() => {
    if (assetTypeFilter === 'vehicles') return []
    return people.filter(p => {
      if (selectedCompanyId) {
        const pCompId = (typeof p.company === 'object' ? p.company?._id : p.company)?.toString()
        const vehCompId = (typeof p.assignedVehicle?.company === 'object' ? p.assignedVehicle?.company?._id : p.assignedVehicle?.company)?.toString()
        if (pCompId !== selectedCompanyId && vehCompId !== selectedCompanyId) return false
      }
      if (selectedVehicle) return false // Hide people if a single vehicle is selected
      if (selectedPerson && selectedPerson._id !== p._id) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match = p.name?.toLowerCase().includes(q) ||
                      p.deviceId?.toLowerCase().includes(q) ||
                      p.trackerCode?.toLowerCase().includes(q) ||
                      p.phone?.toLowerCase().includes(q) ||
                      p.roleDescription?.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [people, assetTypeFilter, selectedCompanyId, selectedVehicle, selectedPerson, searchQuery])

  // Filtered Alerts (Linked to Company & Active Selection)
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (selectedCompanyId) {
        const aComp = (typeof a.company === 'object' ? a.company?._id : a.company)?.toString()
        const vComp = (typeof a.vehicle?.company === 'object' ? a.vehicle?.company?._id : a.vehicle?.company)?.toString()
        const pComp = (typeof a.personTracker?.company === 'object' ? a.personTracker?.company?._id : a.personTracker?.company)?.toString()
        if (aComp !== selectedCompanyId && vComp !== selectedCompanyId && pComp !== selectedCompanyId) return false
      }
      if (selectedVehicle && (a.vehicle?._id !== selectedVehicle._id && a.vehicle !== selectedVehicle._id)) return false
      if (selectedPerson && (a.personTracker?._id !== selectedPerson._id && a.personTracker !== selectedPerson._id)) return false
      return true
    })
  }, [alerts, selectedCompanyId, selectedVehicle, selectedPerson])

  // KPI Calculations (Computed strictly from the active filtered subset)
  const activeVehiclesCount = filteredVehicles.filter(v => v.status === 'active').length
  const activePeopleCount = filteredPeople.filter(p => p.hasReportedLocation && p.status !== 'offline').length
  const totalPanicCount = filteredPeople.filter(p => p.status === 'panic' || p.panicAlert?.active).length +
                          filteredVehicles.filter(v => v.status === 'alert').length
  const unacknowledgedAlertsCount = filteredAlerts.filter(a => !a.acknowledged).length

  const selectedCompanyObj = companies.find(c => String(c._id) === String(selectedCompanyId))

  const handleSelectAsset = (type, item) => {
    if (type === 'vehicle') {
      setSelectedPerson(null)
      setSelectedVehicle(selectedVehicle?._id === item?._id ? null : item)
    } else if (type === 'person') {
      setSelectedVehicle(null)
      setSelectedPerson(selectedPerson?._id === item?._id ? null : item)
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
            <span className="text-[10px] font-mono px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold">
              FLOTAS & PERSONAL 360
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitoreo en tiempo real de vehículos de la empresa y dispositivos móviles familiares/personal de campo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/people-tracker')}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <span>📱</span> Gestión de Móviles / SOS
          </button>
          <a
            href="https://einsoft-gp-sbcknd.vercel.app/eyenode"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-md shadow-cyan-900/20"
            title="Abrir la aplicación táctica EYE-NODE 360"
          >
            <span>🛰️</span> EYE-NODE 360 (App)
          </a>
        </div>
      </div>

      {/* ── Top Unified KPI Stats (Reactive to Company Filter) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vehicles KPI */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-black">
            🚗
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vehículos Flota</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{filteredVehicles.length}</span>
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
              <span className="text-2xl font-black text-slate-900">{filteredPeople.length}</span>
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
              <span className="text-[11px] text-slate-400 font-mono">/ {filteredVehicles.length + filteredPeople.length} activos</span>
            </div>
          </div>
        </div>

        {/* SOS Emergency Alerts KPI */}
        <div className={`p-4 rounded-2xl border shadow-sm flex items-center gap-3 ${
          totalPanicCount > 0 || unacknowledgedAlertsCount > 0
            ? 'bg-rose-50 border-rose-300 text-rose-900 animate-pulse'
            : 'bg-white border-slate-200'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black ${
            totalPanicCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            🚨
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alertas Pendientes</p>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black ${totalPanicCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {unacknowledgedAlertsCount}
              </span>
              <span className="text-[11px] text-slate-500">
                {totalPanicCount > 0 ? '¡PÁNICO ACTIVO!' : unacknowledgedAlertsCount > 0 ? 'Por atender' : 'Todo al día'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Asset Switcher & High-Capacity Filter Bar ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Asset Type Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">VER TIPO:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => { setAssetTypeFilter('all'); setSelectedVehicle(null); setSelectedPerson(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                    assetTypeFilter === 'all' && !selectedVehicle && !selectedPerson
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🌐</span>
                  <span>Todos ({filteredVehicles.length + filteredPeople.length})</span>
                </button>
                <button
                  onClick={() => { setAssetTypeFilter('vehicles'); setSelectedVehicle(null); setSelectedPerson(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                    assetTypeFilter === 'vehicles' && !selectedPerson
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🚗</span>
                  <span>Vehículos ({filteredVehicles.length})</span>
                </button>
                <button
                  onClick={() => { setAssetTypeFilter('people'); setSelectedVehicle(null); setSelectedPerson(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                    assetTypeFilter === 'people' && !selectedVehicle
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>📱</span>
                  <span>Móviles ({filteredPeople.length})</span>
                </button>
              </div>
            </div>

            {/* Company Filter Dropdown */}
            {companies && companies.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">🏢 EMPRESA:</span>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    setSelectedVehicle(null);
                    setSelectedPerson(null);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 hover:bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs"
                >
                  <option value="">🏢 Todas las Empresas ({companies.length})</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Live Search Bar for 50+ Fleets */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <input
                type="text"
                placeholder="🔍 Buscar patente, nombre, IMEI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs font-medium text-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {(selectedVehicle || selectedPerson || searchQuery || selectedCompanyId || assetTypeFilter !== 'all') && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition shrink-0"
            >
              ✕ Restablecer Filtros
            </button>
          )}
        </div>

        {/* Individual Asset Pill Buttons — High-Capacity Scrollable Layout (Filtered by Company & Search) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                🎯 FILTRO INDIVIDUAL DE ACTIVOS ({filteredVehicles.length + filteredPeople.length}):
              </p>
              {selectedCompanyObj && (
                <span className="text-[10px] px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md font-bold">
                  🏢 {selectedCompanyObj.name}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
              Haz clic en un activo para aislarlo en el mapa
            </span>
          </div>

          <div className="max-h-28 overflow-y-auto pr-1 flex flex-wrap items-center gap-1.5 content-start">
            <button
              onClick={() => { setSelectedVehicle(null); setSelectedPerson(null); }}
              className={`px-3 py-1 rounded-xl text-xs font-black transition border shadow-xs ${
                !selectedVehicle && !selectedPerson
                  ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-blue-500 scale-105'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              🌐 Ver Todos Juntos
            </button>

            {/* Vehicle Pills (Strictly filtered by selected company and search) */}
            {(assetTypeFilter === 'all' || assetTypeFilter === 'vehicles') &&
              filteredVehicles.map(v => {
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

            {/* People Pills (Strictly filtered by selected company and search) */}
            {(assetTypeFilter === 'all' || assetTypeFilter === 'people') &&
              filteredPeople.map((p, idx) => {
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

            {/* Empty state when no assets match */}
            {filteredVehicles.length === 0 && filteredPeople.length === 0 && (
              <div className="text-xs text-slate-400 italic py-1 px-2">
                ℹ️ No hay vehículos ni móviles que coincidan con los filtros seleccionados.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Interactive Map & Sidebar Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Central Map (2 Cols) */}
        <div className="lg:col-span-2 min-h-[550px]">
          <MapComponent
            vehicles={filteredVehicles}
            people={filteredPeople}
            selectedVehicle={selectedVehicle}
            selectedPerson={selectedPerson}
            onVehicleSelect={(v) => handleSelectAsset('vehicle', v)}
            onPersonSelect={(p) => handleSelectAsset('person', p)}
            realTimeData={realTimeData}
            assetTypeFilter={assetTypeFilter}
          />
        </div>

        {/* Right Sidebar: Fleet & Alerts Panel */}
        <div className="space-y-6">
          <VehicleList
            vehicles={filteredVehicles}
            selectedVehicle={selectedVehicle}
            onVehicleSelect={(v) => handleSelectAsset('vehicle', v)}
            isLoading={loadingVehicles}
          />

          <AlertsPanel alerts={filteredAlerts} />
        </div>
      </div>
    </div>
  )
}
