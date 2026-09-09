import React, { useState, useEffect } from 'react'
import { apiClient } from '../services/api'
import SosProtocolModal from '../components/SosProtocolModal'
import FuelCutModal from '../components/FuelCutModal'
import TollCalculatorModal from '../components/TollCalculatorModal'
import CommunityAlertsModal from '../components/CommunityAlertsModal'
import CertifiedBackingModal from '../components/CertifiedBackingModal'
import PlannedRoutesModal from '../components/PlannedRoutesModal'

export default function PlataformaPlus() {
  const [overview, setOverview] = useState(null)
  const [activeModal, setActiveModal] = useState(null) // 'sos' | 'fuelCut' | 'tolls' | 'community' | 'certificate' | 'routes' | 'camera' | 'maintenance' | 'ranking'
  const [rankingData, setRankingData] = useState([])
  const [maintenanceData, setMaintenanceData] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState({ plate: 'ABCD-12', brand: 'Toyota', model: 'Hilux 4x4', speed: 0, motorCutStatus: false })

  useEffect(() => {
    loadOverview()
    loadRanking()
    loadMaintenance()
  }, [])

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
      action: () => setActiveModal('sos'),
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

            {/* Quick Emergency Triggers */}
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => setActiveModal('sos')}
                className="px-5 py-3.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black rounded-2xl shadow-xl shadow-red-900/40 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 text-xs sm:text-sm uppercase tracking-wider"
              >
                <span className="text-lg">🚨</span>
                <span>Botón SOS 3s</span>
              </button>

              <button
                onClick={() => setActiveModal('fuelCut')}
                className="px-4 py-3.5 bg-slate-900/90 hover:bg-slate-800 border border-rose-500/40 text-rose-300 font-extrabold rounded-2xl shadow-lg flex items-center gap-2 transition-all active:scale-95 text-xs sm:text-sm"
              >
                <span>⛔</span>
                <span>Corte Combustible</span>
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

      {/* Sección Destacada: Showcase Visual de Plataformas y App Móvil */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 text-white space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>📱</span> Experiencia Móvil & Web de Próxima Generación
            </h2>
            <p className="text-xs text-slate-400">
              Integración total con la aplicación táctica para conductores y gestores de flota
            </p>
          </div>
          <a
            href="/download-app"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all"
          >
            📥 Descargar APK v2.0.0 Oficial
          </a>
        </div>

        {/* 4 Cards con las imágenes proporcionadas por el usuario */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Botón SOS (Imagen 1) */}
          <div
            onClick={() => setActiveModal('sos')}
            className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="h-44 bg-slate-900 overflow-hidden relative flex items-center justify-center p-2">
              <img
                src="/assets/showcase/sos_protocol.png"
                alt="Botón SOS Asistencia 24/7"
                className="h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                SOS 3 Seg
              </div>
            </div>
            <div className="p-4 space-y-1">
              <h4 className="font-extrabold text-sm text-white">Botón SOS & Protocolo</h4>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                Asistencia inmediata 24/7 con selección de eventos y verificación de audio directa.
              </p>
            </div>
          </div>

          {/* Card 2: Trío de Funciones (Imagen 2) */}
          <div
            onClick={() => setActiveModal('fuelCut')}
            className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="h-44 bg-slate-900 overflow-hidden relative flex items-center justify-center p-2">
              <img
                src="/assets/showcase/features_trio.png"
                alt="Historial, Rastreo y Corte de Combustible"
                className="h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 right-2 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                Inmovilizador
              </div>
            </div>
            <div className="p-4 space-y-1">
              <h4 className="font-extrabold text-sm text-white">Corte de Combustible</h4>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                Detiene el auto en un clic, cortando el combustible en caso de robo o uso ajeno.
              </p>
            </div>
          </div>

          {/* Card 3: Reproductor Satelital de Ruta (Imagen 4) */}
          <div
            onClick={() => setActiveModal('routes')}
            className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="h-44 bg-slate-900 overflow-hidden relative flex items-center justify-center p-2">
              <img
                src="/assets/showcase/route_playback_mobile.png"
                alt="Reproductor Histórico Satelital"
                className="h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                Playback
              </div>
            </div>
            <div className="p-4 space-y-1">
              <h4 className="font-extrabold text-sm text-white">Historial de Viajes</h4>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                Reproducción de rutas satelitales con velocidad máxima, paradas P y odómetro.
              </p>
            </div>
          </div>

          {/* Card 4: Rutas de Ida y Regreso (Imagen 5) */}
          <div
            onClick={() => setActiveModal('routes')}
            className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="h-44 bg-slate-900 overflow-hidden relative flex items-center justify-center p-2">
              <img
                src="/assets/showcase/planned_routes_mobile.png"
                alt="Rutas Planificadas de Ida y Regreso"
                className="h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 right-2 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                Planificador
              </div>
            </div>
            <div className="p-4 space-y-1">
              <h4 className="font-extrabold text-sm text-white">Rutas de Ida & Regreso</h4>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                Gestión de circuitos (Casa → Escuela, Base → Cliente) con estados en tiempo real.
              </p>
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

      {/* Modales Interactivos del Ecosistema */}
      <SosProtocolModal
        isOpen={activeModal === 'sos'}
        onClose={() => setActiveModal(null)}
        vehicle={selectedVehicle}
      />

      <FuelCutModal
        isOpen={activeModal === 'fuelCut'}
        onClose={() => setActiveModal(null)}
        vehicle={selectedVehicle}
        onStatusChange={(newStatus) => setSelectedVehicle({ ...selectedVehicle, motorCutStatus: newStatus })}
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
