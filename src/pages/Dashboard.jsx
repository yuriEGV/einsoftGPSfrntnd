import React, { useEffect, useState, useMemo } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/api'
import MapComponent from '../components/MapComponent'
import VehicleList from '../components/VehicleList'
import AlertsPanel from '../components/AlertsPanel'
import { setupSocketConnection } from '../services/socket'
import { getPersonColor } from './PeopleTracker'
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits'

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [assetTypeFilter, setAssetTypeFilter] = useState('all') // 'all' | 'vehicles' | 'people'
  const [socket, setSocket] = useState(null)
  const [realTimeData, setRealTimeData] = useState({})

  // Subscription Limits & Freemium State
  const {
    isPaid,
    isBlocked,
    queriesUsed,
    dailyLimit,
    remainingQueries,
    consumeQuery,
    isConsuming,
    refetchUsage,
    planName,
  } = useSubscriptionLimits()
  const [queryErrorMsg, setQueryErrorMsg] = useState('')
  const [querySuccessMsg, setQuerySuccessMsg] = useState('')

  // Filter States
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const canViewCompanies = ['superadmin', 'admin', 'supervisor', 'fleet_manager', 'auditor'].includes(user.role)

  // 1. Fetch Vehicles (en modo gratuito no auto-pollea para no consumir la consulta diaria)
  const { data: vehicles = [], isLoading: loadingVehicles, refetch: refetchVehicles } = useQuery('vehicles', async () => {
    const response = await apiClient.get('/vehicles')
    return response.data || []
  }, {
    refetchInterval: isPaid ? 5000 : false,
    enabled: isPaid || !isBlocked,
  })

  // 2. Fetch People Trackers
  const { data: people = [], isLoading: loadingPeople, refetch: refetchPeople } = useQuery('peopleTrackers', async () => {
    const response = await apiClient.get('/people-trackers')
    return response.data || []
  }, {
    refetchInterval: isPaid ? 12000 : false,
    enabled: isPaid || !isBlocked,
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

  const handleManualLocationQuery = async () => {
    setQueryErrorMsg('')
    setQuerySuccessMsg('')
    try {
      await consumeQuery()
      await Promise.all([refetchVehicles(), refetchPeople()])
      setQuerySuccessMsg('Ubicación satelital actualizada exitosamente. (1 consulta diaria consumida)')
      setTimeout(() => setQuerySuccessMsg(''), 6000)
    } catch (err) {
      const msg = err.response?.data?.message || 'Límite de 1 consulta diaria alcanzado.'
      setQueryErrorMsg(msg)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Freemium Demo Banner & Paywall Alert ── */}
      {!isPaid && (
        <div className={`rounded-2xl p-4 border transition-all shadow-xl ${
          isBlocked
            ? 'bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-950 border-red-500/50 shadow-red-950/40'
            : 'bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-950 border-cyan-500/40 shadow-cyan-950/30'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border shadow-inner ${
                isBlocked ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
              }`}>
                {isBlocked ? '🚨' : '📡'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Modo Demo / Servicio Gratuito Limitado
                  </span>
                  <span className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full border uppercase ${
                    isBlocked ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  }`}>
                    {queriesUsed}/1 Consulta Diaria Utilizada
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                    Máx. 1 Unidad
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  {isBlocked
                    ? 'Has utilizado la única consulta diaria permitida en el servicio gratuito. El sistema se encuentra bloqueado hasta activar una membresía.'
                    : 'Cuentas con 1 consulta satelital diaria para probar el sistema. Para rastreo continuo en tiempo real 24/7 y alertas, activa tu membresía.'}
                </p>
                {querySuccessMsg && (
                  <p className="text-xs font-bold text-emerald-400 animate-in fade-in">{querySuccessMsg}</p>
                )}
                {queryErrorMsg && (
                  <p className="text-xs font-bold text-red-400 animate-in fade-in">{queryErrorMsg}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {!isBlocked && (
                <button
                  onClick={handleManualLocationQuery}
                  disabled={isConsuming}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-sm disabled:opacity-50"
                >
                  <span>{isConsuming ? '⏳' : '📡'}</span>
                  <span>{isConsuming ? 'Consultando...' : 'Consultar Ubicación (1/1 hoy)'}</span>
                </button>
              )}
              <button
                onClick={() => navigate('/payments')}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-900/40 transition transform active:scale-95"
              >
                <span>💎</span>
                <span>{isBlocked ? 'Ver Planes & Desbloquear' : 'Activar Membresía 24/7'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

          {isPaid ? (
            <AlertsPanel alerts={filteredAlerts} />
          ) : (
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 text-center space-y-3 shadow-lg">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl">
                🛡️
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Centro de Alertas & SOC</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Las alertas automáticas por colisión, botón de pánico SOS 3s y geocercas perimetrales están reservadas para usuarios con membresía.
                </p>
              </div>
              <button
                onClick={() => navigate('/payments')}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                Activar Monitoreo SOC 24/7
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de Bloqueo Paywall (No descartable tras 1 consulta diaria) ── */}
      {!isPaid && isBlocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#090d16] border border-red-500/40 rounded-3xl max-w-lg w-full p-6 md:p-8 text-center shadow-2xl space-y-6 relative overflow-hidden">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-4xl shadow-inner animate-pulse">
              🔒
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/20 text-red-300 border border-red-500/40">
                LÍMITE DIARIO DE CONSULTAS ALCANZADO (1/1)
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                El Monitoreo Gratuito Ha Llegado al Límite
              </h2>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                Has utilizado la única consulta diaria permitida en el plan demo para tu vehículo o teléfono.
                Para acceder a <strong>rastreo satelital continuo 24/7</strong>, historial ilimitado, alertas de seguridad y corte remoto de motor, adquiere una membresía.
              </p>
            </div>

            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-left space-y-2.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Al adquirir una membresía obtienes:
              </div>
              <ul className="text-xs text-slate-300 space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Rastreo satelital ininterrumpido en tiempo real (cada 4 seg.)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Consultas y peticiones ilimitadas todos los días del mes</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Acceso al Centro de Alertas SOS, Geocercas y Reportes</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Plataforma Plus & Certificación Ley 21.171</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/payments')}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-cyan-900/40 transition transform active:scale-95 flex items-center justify-center gap-2"
              >
                <span>💎</span>
                <span>Ver Planes y Activar Membresía GPS</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
