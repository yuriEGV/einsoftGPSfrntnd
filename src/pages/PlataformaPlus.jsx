import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/api'
import SosProtocolModal from '../components/SosProtocolModal'
import SosConfigModal from '../components/SosConfigModal'
import FuelCutModal from '../components/FuelCutModal'
import TollCalculatorModal from '../components/TollCalculatorModal'
import CommunityAlertsModal from '../components/CommunityAlertsModal'
import CertifiedBackingModal from '../components/CertifiedBackingModal'
import PlannedRoutesModal from '../components/PlannedRoutesModal'

export default function PlataformaPlus() {
  const [overview, setOverview] = useState(null)
  const [activeModal, setActiveModal] = useState(null) // 'sos' | 'sosConfig' | 'fuelCut' | 'tolls' | 'community' | 'certificate' | 'routes' | 'camera' | 'maintenance' | 'ranking'
  const [rankingData, setRankingData] = useState([])
  const [maintenanceData, setMaintenanceData] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [fleetVehicles, setFleetVehicles] = useState([])
  const [sosConfig, setSosConfig] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState({ plate: 'ABCD-12', brand: 'Toyota', model: 'Hilux 4x4', speed: 0, motorCutStatus: false })
  const navigate = useNavigate()

  // ── Sub-estados interactivos para modales telemáticos ──
  const [locationSafetyTab, setLocationSafetyTab] = useState('tracks') // 'tracks' | 'geofences'
  const [drivingSafetyTab, setDrivingSafetyTab] = useState('imu') // 'imu' | 'emergency'
  const [tileTrackingTab, setTileTrackingTab] = useState('pets') // 'pets' | 'keys'
  const [imuThreshold, setImuThreshold] = useState('3.5G')
  const [imuTestAlert, setImuTestAlert] = useState(null)
  const [audioFeedback, setAudioFeedback] = useState('')
  const [showAddTileModal, setShowAddTileModal] = useState(false)
  const [newTileName, setNewTileName] = useState('')
  const [newTileType, setNewTileType] = useState('mascota')

  // Lista viva de Mascotas y Objetos
  const [petList, setPetList] = useState([
    { id: 1, name: 'Luna (Golden Retriever)', code: 'TILE-PET-01', battery: 94, status: 'En Casa (Zona Segura)', lat: -33.0294, lng: -71.6344 },
    { id: 2, name: 'Max (Gato Doméstico)', code: 'CHIP-CAT-04', battery: 89, status: 'Cerca de Casa (Radio 15m)', lat: -33.0310, lng: -71.6320 },
  ])
  const [keyList, setKeyList] = useState([
    { id: 1, name: 'Llavero Toyota CBDX81', code: 'KEY-TAG-01', battery: 92, distance: '3.5 m (En Rango)', lastSeen: 'Hace 2 min' },
    { id: 2, name: 'Mochila / Laptop Pro', code: 'TILE-OBJ-02', battery: 85, distance: '8.0 m (En Rango)', lastSeen: 'Hace 5 min' },
  ])

  // Síntesis de sonido Web Audio para Buzzer y Collares
  const playTileAudio = (type = 'beep') => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const ctx = new AudioContext()
      if (type === 'buzzer') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(2200, ctx.currentTime)
        osc.frequency.setValueAtTime(1700, ctx.currentTime + 0.15)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.4)
      } else {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime)
        osc.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.12)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.35)
      }
    } catch (_) {}
  }

  useEffect(() => {
    loadOverview()
    loadRanking()
    loadMaintenance()
    loadFleet()
    loadSosSettings()
  }, [])

  const loadFleet = async () => {
    try {
      const res = await apiClient.get('/vehicles')
      if (Array.isArray(res.data) && res.data.length > 0) {
        setFleetVehicles(res.data)
        setSelectedVehicle(res.data[0])
      }
    } catch (e) {
      console.warn('Fleet fallback:', e)
    }
  }

  const loadSosSettings = async () => {
    try {
      const local = localStorage.getItem('einsoft_sos_config')
      if (local) setSosConfig(JSON.parse(local))
      const res = await apiClient.get('/plataforma-plus/sos-config')
      if (res.data?.config) setSosConfig(res.data.config)
    } catch (_) {}
  }

  const loadOverview = async () => {
    try {
      const res = await apiClient.get('/plataforma-plus/overview')
      setOverview(res.data)
    } catch (e) {
      console.warn('Overview fallback:', e)
      setOverview({
        platform: 'EINSoft GPS Plataforma Plus',
        version: '2.0.0',
        central247: {
          status: 'OPERACIONAL_24_7',
          responseTimeSeconds: 12,
          directProtocols: ['Carabineros 133', 'PDI 134', 'Bomberos 132', 'SAMU 131'],
        },
        stats: {
          totalUnits: 12,
          activeUnits: 9,
          avgDriverSafetyScore: 91.4,
          monthlyTollEstimatedSavings: '$142.500 CLP',
        },
      })
    }
  }

  const loadRanking = async () => {
    try {
      const res = await apiClient.get('/plataforma-plus/driver-ranking')
      setRankingData(res.data.ranking || [])
    } catch (e) {
      setRankingData([
        { rank: 1, driver: 'Carlos Sepúlveda', plate: 'ABCD-12', score: 98, harshBrakes: 0, speedingEvents: 0, badge: '🏆 Conductor de Oro' },
        { rank: 2, driver: 'Yuri Gómez', plate: 'KLMN-89', score: 95, harshBrakes: 1, speedingEvents: 0, badge: '⭐ Excelente' },
        { rank: 3, driver: 'Gloria Rivas', plate: 'TRTY-44', score: 92, harshBrakes: 2, speedingEvents: 1, badge: '⭐ Conducción Segura' },
      ])
    }
  }

  const loadMaintenance = async () => {
    try {
      const res = await apiClient.get('/plataforma-plus/maintenance')
      setMaintenanceData(res.data)
    } catch (e) {
      console.warn('Maintenance fallback:', e)
    }
  }

  // 18 Módulos oficiales de la Plataforma Plus (Copiando fielmente la matriz de la Imagen 3)
  const PLUS_MODULES = [
    {
      id: 'peajes_tag',
      title: 'Peajes / TAG',
      icon: '💵',
      description: 'Informe de gastos en peajes / TAG por período, vehículos y pórticos, con exportación a PDF.',
      action: () => setActiveModal('tolls'),
      badge: 'FINANZAS',
    },
    {
      id: 'calculador_peajes',
      title: 'Calculador de peajes',
      icon: '🛣️',
      description: 'Estima costos de peajes / TAG de un trayecto antes de salir (ida o ida y vuelta).',
      action: () => setActiveModal('tolls'),
      badge: 'ESTIMADOR',
    },
    {
      id: 'asistente_ai',
      title: 'Asistente NaviGPS AI',
      icon: '🤖',
      description: 'Chat en el mapa para ubicación, peajes / TAG, eventos, ranking e informes en lenguaje natural.',
      action: () => {
        // Trigger copilot widget click
        const btn = document.querySelector('button[title*="Copiloto"], .fixed.bottom-6.right-6 button')
        if (btn) btn.click()
        else alert('NaviGPS AI: Puedes activar el asistente conversacional con el botón flotante 🧠 en la esquina inferior derecha.')
      },
      badge: 'GEMINI 3.6',
    },
    {
      id: 'camaras_vivo',
      title: 'Cámaras en vivo',
      icon: '🎥',
      description: 'Video en tiempo real y evidencias desde la misma plataforma (dashcams según plan contratado).',
      action: () => setActiveModal('camera'),
      badge: 'STREAMING',
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: '📊',
      description: 'Panel general con visión rápida del estado operativo de la flota en tiempo real.',
      action: () => window.location.href = '/',
      badge: 'CENTRAL',
    },
    {
      id: 'dispositivos',
      title: 'Dispositivos',
      icon: '📡',
      description: 'Listado de unidades con búsqueda y acceso rápido al detalle de cada vehículo.',
      action: () => window.location.href = '/vehicles',
      badge: '4G LTE',
    },
    {
      id: 'informes',
      title: 'Informes',
      icon: '📋',
      description: 'Reportes de operación con resúmenes, métricas y análisis por períodos y exportación.',
      action: () => window.location.href = '/reports',
      badge: 'MÉTRICAS',
    },
    {
      id: 'ranking',
      title: 'Ranking',
      icon: '🏆',
      description: 'Evaluación de conducción para medir desempeño de conductores y unidades según aceleración y frenadas.',
      action: () => setActiveModal('ranking'),
      badge: 'HÁBITOS',
    },
    {
      id: 'geocercas',
      title: 'Geocercas',
      icon: '🗺️',
      description: 'Creación y gestión de geozonas poligonales con control de entradas y salidas automatizadas.',
      action: () => window.location.href = '/geofences',
      badge: 'ZONAS',
    },
    {
      id: 'recorridos',
      title: 'Recorridos',
      icon: '🔄',
      description: 'Reproducción histórica de rutas y trazas de movimiento con scrubber de tiempo y paradas P.',
      action: () => setActiveModal('routes'),
      badge: 'HISTORIAL',
    },
    {
      id: 'grupos',
      title: 'Grupos',
      icon: '📁',
      description: 'Organización de dispositivos por grupos y divisiones para una administración más eficiente.',
      action: () => alert('Organización de flotas: Las unidades se gestionan por centro de costos y zonas geográficas.'),
      badge: 'ADMIN',
    },
    {
      id: 'usuarios_permisos',
      title: 'Usuarios y permisos',
      icon: '👥',
      description: 'Crea usuarios, define perfiles de acceso y asigna vehículos específicos a cada persona según su rol.',
      action: () => window.location.href = '/users',
      badge: 'SEGURIDAD',
    },
    {
      id: 'eventos',
      title: 'Eventos',
      icon: '⚠️',
      description: 'Configura llamadas automáticas solo para eventos clave: desconexión de batería, GPS desconectado y GeoParking.',
      action: () => setActiveModal('community'),
      badge: 'ALERTAS',
    },
    {
      id: 'llamadas_automaticas',
      title: 'Llamadas automáticas',
      icon: '📞',
      description: 'Transforma eventos críticos específicos en llamadas con mensaje grabado: corte de batería y remolque.',
      action: () => setActiveModal('sosConfig'),
      badge: 'VOZ 24/7',
    },
    {
      id: 'mantencion',
      title: 'Mantención',
      icon: '🔧',
      description: 'Control de mantenimientos y seguimiento preventivo de cada unidad (aceite, frenos, neumáticos, PRT).',
      action: () => setActiveModal('maintenance'),
      badge: 'PREVENTIVO',
    },
    {
      id: 'bloqueo_remoto',
      title: 'Bloqueo remoto',
      icon: '🔒',
      description: 'Detención de motor e inmovilización remota de combustible según compatibilidad del vehículo.',
      action: () => setActiveModal('fuelCut'),
      badge: 'CORTACORRIENTE',
    },
    {
      id: 'combustible',
      title: 'Combustible',
      icon: '⛽',
      description: 'Estimación de consumo, configuración por vehículo y comparación telemática.',
      action: () => alert('Control de Combustible: Monitoreo telemático con estimación de rendimiento y alertas por drenado anómalo.'),
      badge: 'TELEMETRÍA',
    },
    {
      id: 'ayuda',
      title: 'Ayuda',
      icon: '❓',
      description: 'Centro de soporte, garantías permanentes Ley 21.171 y asistencia para usuarios de la plataforma.',
      action: () => setActiveModal('certificate'),
      badge: 'SOPORTE',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      
      {/* Hero Header Táctico Plataforma Plus */}
      <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden border border-purple-500/30">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3.5 py-1 rounded-full bg-purple-500/25 text-purple-300 border border-purple-400/40 text-xs font-black uppercase tracking-wider">
              ⚡ EINSOFT GPS // PLATAFORMA PLUS
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
              🟢 Central 24/7 Carabineros 133 • PDI 134
            </span>
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-bold">
              📜 Respaldo Ley 21.171
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                Ecosistema de Monitoreo Plus
              </h1>
              <p className="text-sm sm:text-base text-purple-200/90 max-w-3xl leading-relaxed mt-2">
                Trazabilidad satelital en tiempo real, seguridad activa de reacción inmediata, telemetría preventiva, módulo financiero de peajes TAG y red colaborativa contra portonazos.
              </p>
            </div>

            {/* Comandos Tácticos & Seguridad de Flota */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Botón 1: Corte de Combustible de Flota */}
              <button
                type="button"
                onClick={() => setActiveModal('fuelCut')}
                className="px-4 py-3 bg-slate-900/90 hover:bg-slate-800 border border-rose-500/40 text-rose-300 font-extrabold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-xs sm:text-sm group"
                title="Selecciona y comanda el cortacorriente de cualquier vehículo de la flota"
              >
                <span className="text-base group-hover:scale-110 transition-transform">⛔</span>
                <span>Corte Combustible</span>
              </button>

              {/* Botón 2: Configuración SOS Previa */}
              <button
                type="button"
                onClick={() => setActiveModal('sosConfig')}
                className={`px-3.5 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
                  sosConfig?.emergencyPhone
                    ? 'bg-slate-900/80 border-cyan-500/30 text-cyan-300 hover:bg-slate-800'
                    : 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 animate-pulse'
                }`}
                title="Configura con antelación el número de teléfono y central de emergencia"
              >
                <span>⚙️</span>
                <span>{sosConfig?.emergencyPhone ? 'Configurar SOS' : '⚠️ Configurar Teléfono SOS'}</span>
              </button>

              {/* Botón 3: Botón SOS 3s */}
              <button
                type="button"
                onClick={() => setActiveModal('sos')}
                className="px-5 py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black rounded-2xl shadow-xl shadow-red-900/40 flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 text-xs sm:text-sm uppercase tracking-wider"
              >
                <span className="text-lg">🚨</span>
                <span>Botón SOS 3s</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-purple-500/20 text-xs">
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Tiempo Respuesta 24/7</span>
              <span className="text-lg font-black text-emerald-400">12 Segundos</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Garantía Hardware</span>
              <span className="text-lg font-black text-cyan-400">Permanente</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Score Manejo Flota</span>
              <span className="text-lg font-black text-purple-400">{overview?.stats?.avgDriverSafetyScore || 91.4} / 100</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Ahorro TAG Estimado</span>
              <span className="text-lg font-black text-amber-400">{overview?.stats?.monthlyTollEstimatedSavings || '$142.500 CLP'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Matriz Oficial de 18 Módulos Plataforma Plus (Fiel réplica interactiva de Imagen 3) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>🎛️</span> Matriz de Operación Plataforma Plus (18 Módulos)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Haz clic sobre cualquier módulo para acceder a sus funciones y herramientas telemáticas
            </p>
          </div>
          <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full font-bold">
            18 / 18 Activos
          </span>
        </div>

        {/* The 18 Module Grid matching Image 3 styling (dark tactical cards with border glow) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLUS_MODULES.map((mod) => (
            <div
              key={mod.id}
              onClick={mod.action}
              className="bg-[#0b1b1e] hover:bg-[#0f2429] border border-[#143c3f] hover:border-[#10b981]/50 rounded-2xl p-5 text-slate-200 shadow-lg cursor-pointer transition-all duration-200 flex flex-col justify-between group transform hover:-translate-y-0.5"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl group-hover:scale-110 transition-transform">
                      {mod.icon}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                    <h3 className="font-extrabold text-base text-white group-hover:text-[#34d399] transition-colors">
                      {mod.title}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#143c3f]/80 text-[#34d399] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {mod.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed pl-1">
                  {mod.description}
                </p>
              </div>

              <div className="pt-3 mt-2 border-t border-[#143c3f]/50 flex items-center justify-between text-[11px] text-[#34d399] font-bold">
                <span>Abrir Módulo</span>
                <span className="transform group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Sección Destacada: Showcase Visual y Pilares de Seguridad ─── */}
      <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 text-white space-y-8 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-5">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase block mb-1">
              Plataforma Táctica & Aplicaciones Móviles
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>🛡️</span> Ecosistema Telemático de Seguridad & Telemetría
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Integración total entre la central web de operaciones (SOC), sensores vehiculares y la app táctica de respuesta.
            </p>
          </div>
          <a
            href="/download-app"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-700 transition-all shadow-md"
          >
            <span>📥</span> Descargar APK v2.0.0 Oficial
          </a>
        </div>

        {/* 4 Cards con las imágenes genéricas sobrias */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Coordinación y Ubicación Familiar (Location Safety) */}
          <div
            onClick={() => setActiveModal('locationSafety')}
            className="bg-[#0b0f19] rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="h-44 bg-slate-950 overflow-hidden relative flex items-center justify-center p-1">
              <img
                src="/assets/showcase/location_safety.jpg"
                alt="Coordinación y Ubicación Familiar"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
              />
              <div className="absolute top-2.5 right-2.5 bg-slate-900/90 text-cyan-300 border border-cyan-500/40 text-[9px] font-black px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                Location Safety
              </div>
            </div>
            <div className="p-4 space-y-1.5 bg-slate-900/60">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <span>📍</span> Ubicación Familiar
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Localización exacta de personas y trayectos en mapa para organización cotidiana y monitoreo seguro.
              </p>
            </div>
          </div>

          {/* Card 2: Seguridad en la Conducción (Driving Safety) */}
          <div
            onClick={() => setActiveModal('drivingSafety')}
            className="bg-[#0b0f19] rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="h-44 bg-slate-950 overflow-hidden relative flex items-center justify-center p-1">
              <img
                src="/assets/showcase/driving_safety.jpg"
                alt="Seguridad en la Conducción"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
              />
              <div className="absolute top-2.5 right-2.5 bg-slate-900/90 text-amber-300 border border-amber-500/40 text-[9px] font-black px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                Driving Safety
              </div>
            </div>
            <div className="p-4 space-y-1.5 bg-slate-900/60">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <span>🚗</span> Seguridad al Volante
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Monitoreo constante de hábitos de conducción, frenadas bruscas e identificación automática de colisiones.
              </p>
            </div>
          </div>

          {/* Card 3: Localización de Objetos y Mascotas (Tile & Beacons) */}
          <div
            onClick={() => setActiveModal('tileTracking')}
            className="bg-[#0b0f19] rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="h-44 bg-slate-950 overflow-hidden relative flex items-center justify-center p-1">
              <img
                src="/assets/showcase/tile_tracking.jpg"
                alt="Localización de Objetos y Mascotas"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
              />
              <div className="absolute top-2.5 right-2.5 bg-slate-900/90 text-emerald-300 border border-emerald-500/40 text-[9px] font-black px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                Tile & Beacons
              </div>
            </div>
            <div className="p-4 space-y-1.5 bg-slate-900/60">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <span>🏷️</span> Objetos y Mascotas
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Enlace directo con balizas Tile en el mapa para recuperar llaves, activos críticos o rastrear mascotas.
              </p>
            </div>
          </div>

          {/* Card 4: Central Receptora 24/7 y Protocolos SOS */}
          <div
            onClick={() => setActiveModal('sos')}
            className="bg-[#0b0f19] rounded-2xl overflow-hidden border border-slate-800 hover:border-red-500/50 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="h-44 bg-slate-950 overflow-hidden relative flex items-center justify-center p-1">
              <img
                src="/assets/showcase/soc_emergency.jpg"
                alt="Central Receptora 24/7"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
              />
              <div className="absolute top-2.5 right-2.5 bg-slate-900/90 text-red-300 border border-red-500/40 text-[9px] font-black px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                SOC 24/7
              </div>
            </div>
            <div className="p-4 space-y-1.5 bg-slate-900/60">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <span>🚨</span> Respuesta y Pánico SOS
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Asistencia inmediata 24/7 con botón SOS de 3 segundos, corte de combustible y despacho a Carabineros y PDI.
              </p>
            </div>
          </div>
        </div>

        {/* ─── Usos y Operaciones Principales & Casos de Uso Destacados ─── */}
        <div className="pt-6 border-t border-slate-800 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span>🏛️</span> Usos y Operaciones Principales de la Plataforma
              </h3>
              <p className="text-xs text-slate-400">
                Soluciones telemáticas diseñadas para el resguardo corporativo y la protección preventiva familiar
              </p>
            </div>
          </div>

          {/* 3 Pilares Operativos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <span>🧭</span>
                <span className="uppercase font-mono">Location Safety</span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-100">Coordinación y Ubicación Familiar</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Permite visualizar la localización exacta de personas en el mapa para facilitar la organización cotidiana y monitorear trayectos habituales o excepcionales sin invadir la privacidad.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <span>🛡️</span>
                <span className="uppercase font-mono">Driving Safety</span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-100">Seguridad en la Conducción</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ofrece soporte constante con monitoreo de conducción, telemetría inercial, identificación de desaceleraciones extremas y colisiones en ruta para auxilio oportuno.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <span>🏷️</span>
                <span className="uppercase font-mono">Asset & Pet Tracking</span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-100">Localización de Objetos y Mascotas</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Permite enlazar y visualizar dispositivos de rastreo Tile y balizas Bluetooth directamente en el mapa unificado de la app para recuperar objetos de valor (como llaves o bolsos) o rastrear mascotas.
              </p>
            </div>
          </div>

          {/* Casos de Uso Destacados */}
          <div className="p-5 rounded-2xl bg-[#080c16] border border-slate-800/90 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-2">
              <span>🎯</span> Casos de Uso Destacados
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="text-cyan-400 font-black text-sm">01</span>
                <div>
                  <strong className="text-slate-100 block mb-0.5">Padres con hijos adolescentes</strong>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Aporta tranquilidad supervisando la velocidad al volante, salidas de geocercas escolares y la llegada segura en desplazamientos nocturnos.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-amber-400 font-black text-sm">02</span>
                <div>
                  <strong className="text-slate-100 block mb-0.5">Autonomía para adultos mayores</strong>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Otorga autonomía con supervisión preventiva a adultos mayores que aún conducen, con alertas ante desorientación y asistencia médica inmediata.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-black text-sm">03</span>
                <div>
                  <strong className="text-slate-100 block mb-0.5">Parejas, familias y amigos</strong>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Facilita la localización en tiempo real entre seres cercanos para coordinar encuentros, asistencia en pana mecánica o resguardo en viajes de carretera.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cámaras en Vivo Modal / Viewer */}
      {activeModal === 'camera' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl p-6 space-y-4 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span>Dashcam 4G LTE en Vivo // {selectedVehicle.plate}</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white font-black">✕</button>
            </div>

            {/* Simulated Live Video Player */}
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1">
                <span>●</span> REC • EN VIVO 1080P
              </div>
              <div className="absolute top-3 right-3 bg-black/60 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded">
                CH-1 (Frontal Vía) • 30 FPS
              </div>

              {/* Road / Cabin Simulation */}
              <div className="text-center space-y-2 p-6">
                <div className="text-5xl animate-pulse">🛣️</div>
                <p className="text-xs font-mono text-cyan-300">
                  Transmisión Encriptada H.265 Activa
                </p>
                <div className="text-[10px] text-slate-400 font-mono">
                  GPS: -33.4372, -70.6506 | Speed: 0 km/h | Audio: Micrófono Abierto
                </div>
              </div>

              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-xs bg-slate-950/80 backdrop-blur-sm p-2 rounded-xl">
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-slate-800 rounded font-bold hover:bg-slate-700">📸 Captura</button>
                  <button className="px-3 py-1 bg-slate-800 rounded font-bold hover:bg-slate-700">🔊 Hablar a Cabina</button>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">● Señal 4G Óptima</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-xs"
              >
                Cerrar Streaming
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ranking de Conducción Modal */}
      {activeModal === 'ranking' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl p-6 space-y-4 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <span>🏆</span> Ranking de Conducción y Hábitos Telemáticos
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white font-black">✕</button>
            </div>

            <p className="text-xs text-slate-400">
              Puntuación mensual calculada con algoritmos de IA sobre eventos de frenadas bruscas, excesos de velocidad y aceleraciones.
            </p>

            <div className="space-y-2">
              {rankingData.map((d) => (
                <div key={d.rank} className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 font-black flex items-center justify-center text-sm border border-purple-500/30">
                      #{d.rank}
                    </span>
                    <div>
                      <div className="font-extrabold text-white text-sm">{d.driver}</div>
                      <div className="text-[11px] text-slate-400">Patente: {d.plate} • {d.badge}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-400">{d.score} pts</span>
                    <div className="text-[10px] text-slate-400">Frenadas: {d.harshBrakes}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mantenimiento Preventivo Modal */}
      {activeModal === 'maintenance' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl p-6 space-y-4 text-white shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <span>🔧</span> Control de Mantenimiento Preventivo de Flota
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white font-black">✕</button>
            </div>

            <div className="space-y-3">
              {maintenanceData?.vehicles?.map((item) => (
                <div key={item.id} className="bg-slate-800/70 p-4 rounded-2xl border border-slate-700 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-sm text-cyan-300">{item.vehicleName}</span>
                    <span className="font-mono bg-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                      {item.currentMileage.toLocaleString()} KM
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {item.tasks.map((task, idx) => (
                      <div key={idx} className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-[11px]">
                        <div>
                          <div className="font-bold text-slate-200">{task.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {task.remainingKm ? `Quedan ${task.remainingKm.toLocaleString()} KM` : `Días: ${task.remainingDays}`}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${task.status === 'urgent' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {task.status === 'urgent' ? 'URGENTE' : 'OK'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 1: Location Safety (Coordinación y Ubicación Familiar) ── */}
      {activeModal === 'locationSafety' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl p-6 space-y-4 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <span className="text-cyan-400">🧭</span> Coordinación y Ubicación Familiar (Location Safety)
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white font-black text-lg">✕</button>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Supervisión en tiempo real de trayectos familiares, seguridad en traslados escolares y geocercas automáticas de arribo.
            </p>

            {/* Pestañas de Función */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLocationSafetyTab('tracks')}
                className={`p-3 rounded-2xl border text-left transition ${
                  locationSafetyTab === 'tracks'
                    ? 'bg-cyan-950/70 border-cyan-500 shadow-md shadow-cyan-950'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-75'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-cyan-300">
                  <span>📡</span> Trazabilidad de Trayectos
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Historial y tiempos estimados de llegada</div>
              </button>

              <button
                type="button"
                onClick={() => setLocationSafetyTab('geofences')}
                className={`p-3 rounded-2xl border text-left transition ${
                  locationSafetyTab === 'geofences'
                    ? 'bg-emerald-950/70 border-emerald-500 shadow-md shadow-emerald-950'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-75'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-300">
                  <span>🛡️</span> Geocercas Familiares
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Alertas automáticas al llegar o salir</div>
              </button>
            </div>

            {/* Contenido según pestaña */}
            {locationSafetyTab === 'tracks' ? (
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-300">Familiares Monitoreados (3 Activos)</span>
                  <span className="text-emerald-400 font-mono text-[10px]">🟢 Red Celular 4G Activa</span>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-cyan-300">Yuri (PER-139F17)</div>
                      <div className="text-[10px] text-slate-400">📍 Playa Ancha, Valparaíso • Batería 95%</div>
                    </div>
                    <button
                      onClick={() => { setActiveModal(null); navigate('/people-tracker') }}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-lg text-[11px] shadow transition"
                    >
                      🗺️ Ver Trayecto
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-cyan-300">Gloria (PER-FC9B50)</div>
                      <div className="text-[10px] text-slate-400">📍 Cerro Placeres, Valparaíso • Batería 88%</div>
                    </div>
                    <button
                      onClick={() => { setActiveModal(null); navigate('/people-tracker') }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-lg text-[11px] transition"
                    >
                      🗺️ Ver Trayecto
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => { setActiveModal(null); navigate('/people-tracker') }}
                    className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow-lg transition"
                  >
                    🚀 Abrir Consola Central de Personas y Trayectos
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-300">Zonas Seguras Familiares</span>
                  <span className="text-cyan-400 text-[10px]">Autonotificación Activa</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-emerald-300">🏡 Hogar (Valparaíso)</div>
                      <div className="text-[10px] text-slate-400">Radio 150m • Notifica al llegar y salir</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                      ACTIVA
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-emerald-300">🏫 Colegio / Universidad</div>
                      <div className="text-[10px] text-slate-400">Radio 250m • Aviso de arribo seguro a padres</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                      ACTIVA
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => { setActiveModal(null); navigate('/geofences') }}
                  className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg transition"
                >
                  ⚙️ Gestionar y Dibujar Geocercas en el Mapa
                </button>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-xs text-slate-300">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Driving Safety (Seguridad en la Conducción) ── */}
      {activeModal === 'drivingSafety' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl p-6 space-y-4 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <span className="text-amber-400">🚗</span> Seguridad en la Conducción (Driving Safety)
              </h3>
              <button onClick={() => { setActiveModal(null); setImuTestAlert(null) }} className="text-slate-400 hover:text-white font-black text-lg">✕</button>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Detección telemática continua de colisiones, frenadas de pánico y coordinación automática con servicios de urgencia 133 / 131.
            </p>

            {/* Pestañas */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDrivingSafetyTab('imu')}
                className={`p-3 rounded-2xl border text-left transition ${
                  drivingSafetyTab === 'imu'
                    ? 'bg-amber-950/70 border-amber-500 shadow-md shadow-amber-950'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-75'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
                  <span>⚡</span> Sensor IMU & Fuerza G
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Acelerómetro triaxial y umbrales de impacto</div>
              </button>

              <button
                type="button"
                onClick={() => setDrivingSafetyTab('emergency')}
                className={`p-3 rounded-2xl border text-left transition ${
                  drivingSafetyTab === 'emergency'
                    ? 'bg-rose-950/70 border-rose-500 shadow-md shadow-rose-950'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-75'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-rose-300">
                  <span>🚨</span> Despacho de Emergencias
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Protocolo 133 y contactos de rescate</div>
              </button>
            </div>

            {/* Alerta de prueba si fue disparada */}
            {imuTestAlert && (
              <div className="p-3 bg-red-950/80 border border-red-500 rounded-2xl text-xs space-y-1 animate-in zoom-in-95">
                <div className="font-black text-red-300 flex items-center gap-2">
                  <span>💥</span> {imuTestAlert.title}
                </div>
                <div className="text-[11px] text-slate-200">{imuTestAlert.message}</div>
                <div className="text-[10px] text-red-400 font-mono">Prioridad: ROJA • Folio Central: SOS-IMU-{Date.now().toString().slice(-4)}</div>
              </div>
            )}

            {/* Contenido según pestaña */}
            {drivingSafetyTab === 'imu' ? (
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-300">Lectura de Telemetría IMU en Vivo</span>
                  <span className="text-emerald-400 font-mono text-[10px]">🟢 Calibrado (1.00G)</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400">Fuerza G Instantánea</div>
                    <div className="text-sm font-black text-amber-400 font-mono">1.02 G</div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400">Eje Triaxial (X/Y/Z)</div>
                    <div className="text-xs font-bold text-cyan-300 font-mono">+0.05 / -0.08 / +1.01</div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400">Inclinación Roll/Pitch</div>
                    <div className="text-xs font-bold text-slate-200 font-mono">2.1° / 0.8°</div>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5">
                    Umbral de Detección de Choque Automático:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['2.8G (Sensible)', '3.5G (Estándar)', '4.2G (Impacto Severo)'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setImuThreshold(opt.split(' ')[0])}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition ${
                          imuThreshold === opt.split(' ')[0]
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playTileAudio('buzzer')
                    setImuTestAlert({
                      title: '¡PRUEBA EXITOSA: IMPACTO 3.8G REGISTRADO!',
                      message: 'Acelerómetro disparó la alerta telemática. Central 24/7 recibió la coordenada y telemetría de frenada.',
                    })
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black rounded-xl text-xs shadow-lg transition"
                >
                  ⚡ Simular Prueba de Impacto IMU (Disparar Test)
                </button>
              </div>
            ) : (
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-300">Directorio de Rescate Inmediato</span>
                  <span className="text-rose-400 font-mono text-[10px]">🚨 Prioridad Roja</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-rose-400">🚓 Carabineros de Chile</div>
                      <div className="text-[10px] text-slate-400">Emergencia Policial</div>
                    </div>
                    <span className="px-2 py-1 bg-rose-950 text-rose-300 font-black rounded-lg text-xs font-mono">133</span>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-emerald-400">🚑 Ambulancia SAMU</div>
                      <div className="text-[10px] text-slate-400">Rescate Médico</div>
                    </div>
                    <span className="px-2 py-1 bg-emerald-950 text-emerald-300 font-black rounded-lg text-xs font-mono">131</span>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-amber-400">🚒 Bomberos</div>
                      <div className="text-[10px] text-slate-400">Rescate Vehicular</div>
                    </div>
                    <span className="px-2 py-1 bg-amber-950 text-amber-300 font-black rounded-lg text-xs font-mono">132</span>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-cyan-400">🕵️ PDI</div>
                      <div className="text-[10px] text-slate-400">Investigación Policial</div>
                    </div>
                    <span className="px-2 py-1 bg-cyan-950 text-cyan-300 font-black rounded-lg text-xs font-mono">134</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <div className="font-bold text-slate-200">📞 Contacto Telefónico de Emergencia:</div>
                  <div className="font-mono text-cyan-400">+56 9 8765 4321 (Guardado)</div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => { setActiveModal(null); setImuTestAlert(null) }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-xs text-slate-300">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 3: Tile & Beacons (Localización de Objetos y Mascotas) ── */}
      {activeModal === 'tileTracking' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl p-6 space-y-4 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <span className="text-emerald-400">🏷️</span> Localización de Objetos y Mascotas (Tile & Beacons)
              </h3>
              <button onClick={() => { setActiveModal(null); setAudioFeedback('') }} className="text-slate-400 hover:text-white font-black text-lg">✕</button>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Enlaza chips telemáticos para mascotas y dispositivos Tile/Beacon para llaves de vehículos y objetos personales.
            </p>

            {/* Pestañas */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTileTrackingTab('pets')}
                className={`p-3 rounded-2xl border text-left transition ${
                  tileTrackingTab === 'pets'
                    ? 'bg-emerald-950/70 border-emerald-500 shadow-md shadow-emerald-950'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-75'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-300">
                  <span>🐕</span> Rastreo de Mascotas
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Collares con chip telemático y radio seguro</div>
              </button>

              <button
                type="button"
                onClick={() => setTileTrackingTab('keys')}
                className={`p-3 rounded-2xl border text-left transition ${
                  tileTrackingTab === 'keys'
                    ? 'bg-cyan-950/70 border-cyan-500 shadow-md shadow-cyan-950'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-75'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-cyan-300">
                  <span>🔑</span> Objetos & Llaves de Vehículo
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Timbre sonoro de proximidad y última posición</div>
              </button>
            </div>

            {/* Aviso acústico en vivo */}
            {audioFeedback && (
              <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-2xl text-xs font-bold text-emerald-300 flex items-center justify-between animate-in zoom-in-95">
                <span className="flex items-center gap-2">
                  <span className="animate-ping">🔊</span> {audioFeedback}
                </span>
                <button onClick={() => setAudioFeedback('')} className="text-slate-400 hover:text-white">✕</button>
              </div>
            )}

            {/* Contenido según pestaña */}
            {tileTrackingTab === 'pets' ? (
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-300">Collares GPS & Chips Enlazados ({petList.length})</span>
                  <button
                    onClick={() => setShowAddTileModal(true)}
                    className="text-emerald-400 hover:text-emerald-300 font-bold text-[11px] flex items-center gap-1"
                  >
                    <span>➕</span> Enlazar Collar
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {petList.map((pet) => (
                    <div key={pet.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                          <span>🐕</span> {pet.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {pet.code} • Batería: {pet.battery}%</div>
                        <div className="text-[10px] text-slate-300 mt-0.5">📍 {pet.status}</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            playTileAudio('beep')
                            setAudioFeedback(`Emitiendo pitido acústico en ${pet.name}...`)
                          }}
                          className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-black rounded-xl text-[11px] flex items-center gap-1 transition shadow active:scale-95"
                        >
                          <span>🔊</span> Pitido
                        </button>
                        <button
                          type="button"
                          onClick={() => { setActiveModal(null); navigate('/people-tracker') }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-[11px] transition"
                        >
                          📍 Mapa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-300">Dispositivos Tile / Beacon Enlazados ({keyList.length})</span>
                  <button
                    onClick={() => setShowAddTileModal(true)}
                    className="text-cyan-400 hover:text-cyan-300 font-bold text-[11px] flex items-center gap-1"
                  >
                    <span>➕</span> Enlazar Objeto
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {keyList.map((k) => (
                    <div key={k.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                          <span>🔑</span> {k.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {k.code} • Batería: {k.battery}%</div>
                        <div className="text-[10px] text-slate-300 mt-0.5">📡 {k.distance} • {k.lastSeen}</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            playTileAudio('buzzer')
                            setAudioFeedback(`¡Haciendo sonar buzzer en ${k.name}!`)
                          }}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl text-[11px] flex items-center gap-1 transition shadow active:scale-95"
                        >
                          <span>🔔</span> Sonar Buzzer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mini Modal para Enlazar Nuevo Dispositivo */}
            {showAddTileModal && (
              <div className="p-3.5 bg-slate-950 border-2 border-emerald-500/50 rounded-2xl text-xs space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>➕ Enlazar Nuevo Dispositivo Tile / Collar</span>
                  <button onClick={() => setShowAddTileModal(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nombre (ej: Firulais, Llaves Moto)"
                    value={newTileName}
                    onChange={(e) => setNewTileName(e.target.value)}
                    className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none text-xs"
                  />
                  <select
                    value={newTileType}
                    onChange={(e) => setNewTileType(e.target.value)}
                    className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none text-xs"
                  >
                    <option value="mascota">🐾 Mascota (Collar GPS)</option>
                    <option value="objeto">🔑 Objeto / Llave (Beacon Tile)</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newTileName.trim()) return
                    if (newTileType === 'mascota') {
                      setPetList([...petList, { id: Date.now(), name: newTileName, code: `TILE-PET-${Math.floor(10 + Math.random() * 90)}`, battery: 100, status: 'Vinculado y En Línea' }])
                    } else {
                      setKeyList([...keyList, { id: Date.now(), name: newTileName, code: `KEY-TAG-${Math.floor(10 + Math.random() * 90)}`, battery: 100, distance: '1.2 m (En Rango)', lastSeen: 'Recién enlazado' }])
                    }
                    setNewTileName('')
                    setShowAddTileModal(false)
                    setAudioFeedback(`¡Dispositivo ${newTileName} enlazado con éxito!`)
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow transition"
                >
                  Guardar y Sincronizar con el Mapa
                </button>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => { setActiveModal(null); setAudioFeedback('') }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-xs text-slate-300">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales Interactivos del Ecosistema */}
      <SosConfigModal
        isOpen={activeModal === 'sosConfig'}
        onClose={() => setActiveModal(null)}
        onSaveConfig={(newCfg) => setSosConfig(newCfg)}
      />

      <SosProtocolModal
        isOpen={activeModal === 'sos'}
        onClose={() => setActiveModal(null)}
        vehicle={selectedVehicle}
        onOpenConfig={() => setActiveModal('sosConfig')}
      />

      <FuelCutModal
        isOpen={activeModal === 'fuelCut'}
        onClose={() => setActiveModal(null)}
        vehicle={selectedVehicle}
        vehicles={fleetVehicles}
        onStatusChange={(updatedVehicle, newStatus) => {
          setSelectedVehicle(updatedVehicle)
          setFleetVehicles((prev) =>
            prev.map((v) =>
              v._id === updatedVehicle._id || v.plate === updatedVehicle.plate
                ? { ...v, motorCutStatus: newStatus }
                : v
            )
          )
        }}
      />

      <TollCalculatorModal
        isOpen={activeModal === 'tolls'}
        onClose={() => setActiveModal(null)}
      />

      <CommunityAlertsModal
        isOpen={activeModal === 'community'}
        onClose={() => setActiveModal(null)}
      />

      <CertifiedBackingModal
        isOpen={activeModal === 'certificate'}
        onClose={() => setActiveModal(null)}
        vehicle={selectedVehicle}
      />

      <PlannedRoutesModal
        isOpen={activeModal === 'routes'}
        onClose={() => setActiveModal(null)}
        vehicle={selectedVehicle}
      />
    </div>
  )
}
