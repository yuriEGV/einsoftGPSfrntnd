import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/api'
import MapComponent from '../components/MapComponent'
import VehicleList from '../components/VehicleList'
import AlertsPanel from '../components/AlertsPanel'
import StatsDashboard from '../components/StatsDashboard'
import { setupSocketConnection } from '../services/socket'

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [socket, setSocket] = useState(null)
  const [realTimeData, setRealTimeData] = useState({})

  // Filter States
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'offline', 'alert'
  const [searchQuery, setSearchQuery] = useState('')

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = user.role === 'admin'
  const isFleetManager = user.role === 'fleet_manager'
  const isIndependent = user.role === 'independent'
  const canManageFleet = isAdmin || isFleetManager

  // Fetch vehicles with polling fallback for Vercel
  const { data: vehicles = [], isLoading } = useQuery('vehicles', async () => {
    const response = await apiClient.get('/vehicles')
    return response.data
  }, {
    refetchInterval: 5000,
  })

  // Fetch companies — solo admin
  const { data: companies = [] } = useQuery('companies', async () => {
    const response = await apiClient.get('/companies')
    return response.data
  }, { enabled: isAdmin })

  // Fetch users/conductores — solo admin y fleet_manager (no independiente)
  const { data: usersList = [] } = useQuery('users', async () => {
    const response = await apiClient.get('/users')
    return response.data
  }, { enabled: canManageFleet })

  // Fetch alerts — por scope del rol (el backend filtra)
  const { data: alerts = [] } = useQuery('alerts', async () => {
    const response = await apiClient.get('/alerts', { params: { limit: 10 } })
    return response.data
  }, {
    refetchInterval: 5000,
  })

  // Setup WebSocket — also invalidate vehicles query when real-time data arrives
  useEffect(() => {
    const newSocket = setupSocketConnection()
    if (!newSocket) return
    setSocket(newSocket)

    newSocket.on('location_update', (data) => {
      setRealTimeData(prev => ({
        ...prev,
        [data.vehicleId]: data
      }))
      // Also invalidate vehicles cache so the vehicle list refreshes with new position
      queryClient.invalidateQueries('vehicles')
    })

    if (selectedVehicle) {
      newSocket.emit('subscribe_vehicle', selectedVehicle._id)
    }

    return () => {
      if (selectedVehicle) {
        newSocket.emit('unsubscribe_vehicle', selectedVehicle._id)
      }
    }
  }, [selectedVehicle])

  // Filter Vehicles Logic
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      // Company filter
      if (selectedCompanyId && (v.company?._id !== selectedCompanyId && v.company !== selectedCompanyId)) {
        return false
      }
      // Driver / User filter
      if (selectedDriverId && (v.driver?._id !== selectedDriverId && v.driver !== selectedDriverId)) {
        return false
      }
      // Status filter
      if (statusFilter !== 'all' && v.status !== statusFilter) {
        return false
      }
      // Search query (Plate, Make, Model, IMEI, Driver Name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const plateMatch = v.licensePlate?.toLowerCase().includes(q)
        const makeMatch = v.make?.toLowerCase().includes(q)
        const modelMatch = v.model?.toLowerCase().includes(q)
        const imeiMatch = v.deviceIMEI?.toLowerCase().includes(q)
        const driverName = v.driver?.name || v.assignedDriver || ''
        const driverMatch = driverName.toLowerCase().includes(q)

        if (!plateMatch && !makeMatch && !modelMatch && !imeiMatch && !driverMatch) {
          return false
        }
      }
      return true
    })
  }, [vehicles, selectedCompanyId, selectedDriverId, statusFilter, searchQuery])

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {canManageFleet ? 'Control de Gestión de Viajes & Flota' : 'Mis Vehículos'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {canManageFleet
              ? 'Monitoreo interactivo en tiempo real por Empresa, Conductor y Dispositivo GPS.'
              : 'Monitoreo en tiempo real de tus vehículos registrados.'}
          </p>
        </div>
        <div className="text-sm font-semibold text-gray-600 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <span>🚗 <strong className="text-blue-600">{filteredVehicles.length}</strong> / {vehicles.length} Monitoreados</span>
          <span className="text-gray-300">|</span>
          <span>🚨 <strong className="text-amber-600">{alerts.length}</strong> Alertas</span>
        </div>
      </div>

      {/* Resumen Estadístico */}
      <StatsDashboard vehicles={filteredVehicles} alerts={alerts} />

      {/* ===== BARRA DE FILTROS & CONTROL DE GESTIÓN ===== */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            🎛️ Filtros de Monitoreo & Control de Viajes
          </h2>
          {(selectedCompanyId || selectedDriverId || statusFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCompanyId('')
                setSelectedDriverId('')
                setStatusFilter('all')
                setSearchQuery('')
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-all"
            >
              ✕ Limpiar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          {/* Filtro Empresa */}
          {isAdmin && (
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Empresa / Cliente</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 transition-all font-medium text-xs"
              >
                <option value="">🏢 Todas las Empresas</option>
                {companies.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro Conductor / Usuario — solo admin y fleet_manager */}
          {canManageFleet && (
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Conductor / Usuario</label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 transition-all font-medium text-xs"
            >
              <option value="">👤 Todos los Conductores / Usuarios</option>
              {usersList.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          )}

          {/* Filtro Estado */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Estado de Conexión</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 transition-all font-medium text-xs"
            >
              <option value="all">⚡ Todos los Estados</option>
              <option value="active">🟢 En Movimiento / Activo</option>
              <option value="offline">⚪ Detenido / Sin conexión</option>
              <option value="alert">🔴 En Alerta</option>
            </select>
          </div>

          {/* Buscador general */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Buscar Vehículo o IMEI</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Patente, Marca, IMEI..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs"
            />
          </div>
        </div>
      </div>

      {/* ===== PANEL DE CONTROL DEL VEHÍCULO SELECCIONADO ===== */}
      {selectedVehicle && (
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-xl border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600/30 p-3.5 rounded-2xl border border-blue-400/30 text-3xl">
              🚗
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-wide">{selectedVehicle.licensePlate}</h3>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                  selectedVehicle.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                }`}>
                  {selectedVehicle.status === 'active' ? '● En Ruta / En Movimiento' : '● Detenido'}
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                {selectedVehicle.make} {selectedVehicle.model} • Conductor: <strong className="text-white">{selectedVehicle.assignedDriver || selectedVehicle.driver?.name || 'Sin asignar'}</strong>
              </p>
              <p className="text-[11px] text-blue-300/70 mt-1 font-mono">
                📍 {selectedVehicle.location?.address || 'Ubicación activa en mapa'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-right">
              <span className="text-gray-400 block text-[9px] uppercase font-bold">Velocidad</span>
              <span className="text-emerald-400 font-bold text-sm">{selectedVehicle.speed || 0} km/h</span>
            </div>

            <button
              onClick={() => navigate(`/vehicles/${selectedVehicle._id}`)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/30 flex items-center gap-1.5"
            >
              🔍 Ver Ficha Completa & Rastreo BLE
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <MapComponent
            vehicles={filteredVehicles}
            selectedVehicle={selectedVehicle}
            onVehicleSelect={setSelectedVehicle}
            realTimeData={realTimeData}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vehicle List */}
          <VehicleList
            vehicles={filteredVehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
            isLoading={isLoading}
          />

          {/* Alerts */}
          <AlertsPanel alerts={alerts.slice(0, 5)} />
        </div>
      </div>
    </div>
  )
}
