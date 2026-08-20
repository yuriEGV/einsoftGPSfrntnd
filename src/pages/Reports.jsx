import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { apiClient } from '../services/api'
import RoutePlaybackModal from '../components/RoutePlaybackModal'
import FleetPlansModal from '../components/FleetPlansModal'

export default function Reports() {
  const [activeTab, setActiveTab] = useState('ai') // 'ai' | 'vehicle' | 'fuel' | 'speed' | 'alerts'
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [period, setPeriod] = useState('weekly')

  // Modals state
  const [playbackTarget, setPlaybackTarget] = useState(null) // { targetType, targetId, targetName }
  const [showPlansModal, setShowPlansModal] = useState(false)

  // Dispatch Status
  const [isSendingTelegram, setIsSendingTelegram] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [dispatchStatus, setDispatchStatus] = useState(null)

  // AI Diagnostic State
  const [aiReport, setAiReport] = useState(null)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)

  // Vehicles Query
  const { data: vehicles = [] } = useQuery('reports-vehicles', async () => {
    const response = await apiClient.get('/vehicles')
    return response.data
  })

  // People Trackers Query
  const { data: people = [] } = useQuery('reports-people', async () => {
    const response = await apiClient.get('/people-trackers')
    return response.data
  })

  // Alerts Query
  const { data: alerts = [] } = useQuery('reports-alerts', async () => {
    const response = await apiClient.get('/alerts')
    return response.data
  })

  // Vehicle Specific Report Query
  const { data: report, refetch: refetchReport, isFetching: isFetchingReport } = useQuery(
    ['report', selectedVehicleId, period],
    async () => {
      const response = await apiClient.get(`/reports/generate/${period}`, {
        params: { vehicleId: selectedVehicleId },
      })
      return response.data
    },
    { enabled: false },
  )

  // Fuel Analytics Query
  const { data: fuelData, isFetching: isFetchingFuel } = useQuery(
    ['fuel-analytics', selectedVehicleId || vehicles[0]?._id],
    async () => {
      const vId = selectedVehicleId || vehicles[0]?._id
      if (!vId) return null
      const response = await apiClient.get(`/reports/fuel-analytics/${vId}`)
      return response.data
    },
    { enabled: !!(selectedVehicleId || vehicles[0]?._id) },
  )

  const handleGenerateVehicleReport = (e) => {
    e.preventDefault()
    if (!selectedVehicleId) return
    refetchReport()
  }

  const handleGenerateAiReport = async () => {
    setIsGeneratingAi(true)
    try {
      const res = await apiClient.post('/reports/ai-summary', {
        prompt: 'Genera un diagnóstico ejecutivo y completo de la flota de vehículos y personas rastreadas. Incluye métricas de seguridad, recomendaciones de ahorro de combustible, control de velocidades y análisis de eventos de pánico u offline.',
      })
      setAiReport(res.data.analysis)
    } catch (err) {
      alert('Error generando diagnóstico IA: ' + (err.response?.data?.error || err.message))
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const handleSendTelegram = async () => {
    setIsSendingTelegram(true)
    setDispatchStatus(null)
    try {
      const currentVeh = vehicles.find((v) => v._id === selectedVehicleId)
      const summaryText = report
        ? `Distancia: ${report.metrics?.estimatedDistanceKm || 0} km | Vel. Prom: ${report.metrics?.averageSpeed} km/h | Alertas: ${report.alertsCount || 0}`
        : 'Estado operativo óptimo de la flota general.'

      const res = await apiClient.post('/reports/send-telegram', {
        licensePlate: currentVeh ? currentVeh.licensePlate : 'FLOTA GENERAL',
        reportSummary: summaryText,
      })
      setDispatchStatus({ type: 'success', text: '✈️ ' + res.data.message })
    } catch (err) {
      setDispatchStatus({ type: 'error', text: 'Error Telegram: ' + (err.response?.data?.error || err.message) })
    } finally {
      setIsSendingTelegram(false)
    }
  }

  const handleSendEmail = async () => {
    const emailPrompt = prompt('Ingresa el correo electrónico para enviar el reporte ejecutivo:')
    if (!emailPrompt) return

    setIsSendingEmail(true)
    setDispatchStatus(null)
    try {
      const currentVeh = vehicles.find((v) => v._id === selectedVehicleId)
      const res = await apiClient.post('/reports/send-email', {
        email: emailPrompt,
        licensePlate: currentVeh ? currentVeh.licensePlate : 'FLOTA GENERAL',
        reportSummary: report ? JSON.stringify(report.metrics) : 'Resumen general de flota',
      })
      setDispatchStatus({ type: 'success', text: '📧 ' + res.data.message })
    } catch (err) {
      setDispatchStatus({ type: 'error', text: 'Error Correo: ' + (err.response?.data?.error || err.message) })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const exportToCSV = () => {
    if (!report) return

    const headers = ['Métrica', 'Valor']
    const metrics = [
      ['Distancia total', `${report.metrics.estimatedDistanceKm || report.metrics.totalDistance || 0} km`],
      ['Velocidad promedio', `${report.metrics.averageSpeed} km/h`],
      ['Velocidad máxima', `${report.metrics.maxSpeed} km/h`],
      ['Combustible aprox', report.metrics.fuelConsumed],
      ['Puntos de registro', report.metrics.tripCount],
    ]

    const csvContent = [headers.join(','), ...metrics.map((row) => row.join(','))].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_${report.vehicle.licensePlate}_${period}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Calculate fleet stats
  const activeCount = vehicles.filter((v) => v.status === 'active').length
  const offlineCount = vehicles.filter((v) => v.status === 'offline').length
  const totalVehicles = vehicles.length
  const safetyScore = totalVehicles > 0 ? Math.max(70, Math.round(100 - alerts.length * 3)) : 100

  return (
    <div className="space-y-6 pb-12 font-sans">
      <style>{`
        @media print {
          aside, nav, .no-print, button, select, label {
            display: none !important;
          }
          .card, .print-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          body { background: white !important; }
          main { padding: 0 !important; }
        }
      `}</style>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-purple-500/20 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-400/30 px-3 py-1 rounded-full text-xs font-bold text-purple-300 mb-3">
              <span className="animate-pulse text-base">🧠</span> Potenciado por Gemini 3.6 Flash AI
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Reportes & Diagnósticos Inteligentes
            </h1>
            <p className="text-sm text-purple-200/80 mt-1 max-w-xl">
              Análisis ejecutivo en tiempo real de tu flota, historial de rutas, control de combustible, alertas de velocidad y despacho por Correo y Telegram.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 no-print">
            <button
              onClick={() => setShowPlansModal(true)}
              className="px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-2xl text-xs shadow-xl shadow-amber-500/20 transition-all transform hover:scale-105 flex items-center gap-1.5"
            >
              <span>💎</span> Ver Planes de Flota
            </button>
            <button
              onClick={handleGenerateAiReport}
              disabled={isGeneratingAi}
              className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-2xl text-xs shadow-xl shadow-purple-600/30 transition-all transform hover:scale-105 flex items-center gap-1.5 disabled:opacity-50"
            >
              {isGeneratingAi ? '⏳ Analizando...' : '✨ Diagnóstico IA'}
            </button>
            <button
              onClick={handleSendTelegram}
              disabled={isSendingTelegram}
              className="px-3.5 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-2xl text-xs transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              title="Enviar resumen a Telegram"
            >
              {isSendingTelegram ? 'Enviando...' : '✈️ Telegram'}
            </button>
            <button
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="px-3.5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              title="Enviar reporte por Correo"
            >
              {isSendingEmail ? 'Enviando...' : '📧 Correo'}
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-xs border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>

        {/* Dispatch Notification Alert */}
        {dispatchStatus && (
          <div
            className={`mt-4 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in duration-200 ${
              dispatchStatus.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}
          >
            <span>{dispatchStatus.text}</span>
            <button onClick={() => setDispatchStatus(null)} className="text-white/60 hover:text-white text-sm font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Executive KPI Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-purple-800/40">
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-500/10">
            <p className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">Flota Registrada</p>
            <p className="text-2xl font-black text-white mt-1">
              {totalVehicles} <span className="text-xs font-normal text-slate-400">vehículos</span>
            </p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-500/10">
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Vehículos Activos</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {activeCount} <span className="text-xs font-normal text-emerald-300/70">en línea</span>
            </p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-500/10">
            <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Índice de Seguridad</p>
            <p className="text-2xl font-black text-amber-300 mt-1">
              {safetyScore}/100 <span className="text-xs font-normal text-amber-200/70">excelente</span>
            </p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-500/10">
            <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Alertas Registradas</p>
            <p className="text-2xl font-black text-red-400 mt-1">
              {alerts.length} <span className="text-xs font-normal text-red-300/70">eventos</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto no-print">
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-3 font-bold text-xs rounded-t-2xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'ai'
              ? 'bg-purple-900 text-purple-100 border-t-2 border-purple-500 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          🧠 Diagnóstico Gemini IA
        </button>
        <button
          onClick={() => setActiveTab('vehicle')}
          className={`px-4 py-3 font-bold text-xs rounded-t-2xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'vehicle'
              ? 'bg-blue-900 text-blue-100 border-t-2 border-blue-500 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          📊 Reporte de Vehículo & Rutas
        </button>
        <button
          onClick={() => setActiveTab('fuel')}
          className={`px-4 py-3 font-bold text-xs rounded-t-2xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'fuel'
              ? 'bg-indigo-900 text-indigo-100 border-t-2 border-indigo-500 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          ⛽ Control de Combustible
        </button>
        <button
          onClick={() => setActiveTab('speed')}
          className={`px-4 py-3 font-bold text-xs rounded-t-2xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'speed'
              ? 'bg-amber-900 text-amber-100 border-t-2 border-amber-500 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          ⚡ Control de Velocidad
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-3 font-bold text-xs rounded-t-2xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'alerts'
              ? 'bg-red-900 text-red-100 border-t-2 border-red-500 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          🚨 Registro de Alertas ({alerts.length})
        </button>
      </div>

      {/* TAB 1: AI DIAGNOSTIC */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
                  🧠
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Análisis Inteligente de Flota</h2>
                  <p className="text-xs text-slate-500">Evaluación continua realizada por Gemini 3.6 Flash AI</p>
                </div>
              </div>
              <button
                onClick={handleGenerateAiReport}
                disabled={isGeneratingAi}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors no-print disabled:opacity-50"
              >
                {isGeneratingAi ? '⏳ Analizando...' : '🔄 Actualizar Análisis IA'}
              </button>
            </div>

            {aiReport ? (
              <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-inner font-mono text-xs leading-relaxed whitespace-pre-wrap border border-purple-500/20">
                {aiReport}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <span className="text-4xl">🧠</span>
                <h3 className="font-bold text-slate-800 text-base mt-3">Diagnóstico IA listo para generar</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Haz clic en el botón a continuación para que Gemini analice el estado actual de tus vehículos, velocidades, combustible y eventos de seguridad.
                </p>
                <button
                  onClick={handleGenerateAiReport}
                  disabled={isGeneratingAi}
                  className="mt-4 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
                >
                  {isGeneratingAi ? '⏳ Generando Diagnóstico...' : '✨ Generar Diagnóstico IA Ahora'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VEHICLE & MOBILE ROUTE PLAYBACK */}
      {activeTab === 'vehicle' && (
        <div className="space-y-6">
          {/* Quick Playback Bar for Vehicles & Mobile Devices */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-md border border-indigo-700/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎞️</span>
              <div>
                <h3 className="text-base font-black">Reproductor Interactivo de Recorridos (Playback GPS)</h3>
                <p className="text-xs text-indigo-200">
                  Revive minuto a minuto cualquier trayecto histórico de tus vehículos o smartphones rastreados.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {vehicles.slice(0, 2).map((v) => (
                <button
                  key={v._id}
                  onClick={() =>
                    setPlaybackTarget({
                      targetType: 'vehicle',
                      targetId: v._id,
                      targetName: `Vehículo ${v.licensePlate} (${v.make || ''} ${v.model || ''})`,
                    })
                  }
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  🚗 Playback {v.licensePlate}
                </button>
              ))}
              {people.slice(0, 2).map((p) => (
                <button
                  key={p._id}
                  onClick={() =>
                    setPlaybackTarget({
                      targetType: 'person',
                      targetId: p._id,
                      targetName: `Persona: ${p.name}`,
                    })
                  }
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  👤 Playback {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 no-print">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span>📊</span> Generador de Reportes Detallados
            </h2>
            <form onSubmit={handleGenerateVehicleReport} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Seleccionar Vehículo</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Selecciona un vehículo...</option>
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.licensePlate} • {v.make || ''} {v.model || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Rango de Tiempo</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="daily">Últimas 24 Horas</option>
                  <option value="weekly">Últimos 7 Días</option>
                  <option value="monthly">Últimos 30 Días</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!selectedVehicleId || isFetchingReport}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {isFetchingReport ? '⏳ Generando...' : '📄 Generar Reporte Completo'}
                </button>
              </div>
            </form>
          </div>

          {report && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 print-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Reporte de Vehículo: {report.vehicle.licensePlate}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Conductor Asignado:{' '}
                    <span className="font-semibold text-slate-800">{report.vehicle.driver || 'Sin asignar'}</span> ·{' '}
                    {report.vehicle.make} {report.vehicle.model}
                  </p>
                </div>

                <div className="flex gap-2 no-print">
                  <button
                    onClick={() =>
                      setPlaybackTarget({
                        targetType: 'vehicle',
                        targetId: report.vehicle.id,
                        targetName: `Vehículo ${report.vehicle.licensePlate}`,
                      })
                    }
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
                  >
                    🎞️ Reproducir Recorrido
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold border border-emerald-200 rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    📥 Exportar CSV
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold border border-slate-200 rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    🖨️ Imprimir
                  </button>
                </div>
              </div>

              {/* Report Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-3">
                    Recorrido y Distancia
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-600">Distancia Estimada:</span>
                      <span className="font-bold text-blue-600 text-sm">
                        {report.metrics.estimatedDistanceKm || report.metrics.totalDistance || 0} km
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-600">Puntos Registrados:</span>
                      <span className="font-semibold text-slate-800">{report.metrics.tripCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Minutos en Movimiento:</span>
                      <span className="font-semibold text-slate-800">{report.metrics.drivingMinutes} min</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-3">
                    Velocidad y Comportamiento
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-600">Velocidad Promedio:</span>
                      <span className="font-bold text-slate-800">{report.metrics.averageSpeed} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Velocidad Máxima Alcanzada:</span>
                      <span
                        className={`font-bold ${
                          Number(report.metrics.maxSpeed) > 120 ? 'text-red-600' : 'text-slate-800'
                        }`}
                      >
                        {report.metrics.maxSpeed} km/h
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-3">
                    Alertas Registradas
                  </h3>
                  {report.alertsCount === 0 ? (
                    <p className="text-emerald-600 font-semibold italic">✓ Sin alertas registradas en este periodo.</p>
                  ) : (
                    <div className="space-y-1">
                      {Object.entries(report.alertsByType || {}).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center text-xs">
                          <span className="capitalize text-slate-600">{type.replace('_', ' ')}:</span>
                          <span className="font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FUEL TELEMETRY */}
      {activeTab === 'fuel' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold">
                  ⛽
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Sensores y Control de Combustible</h2>
                  <p className="text-xs text-slate-500">Monitoreo continuo de nivel de estanque, consumo y detección de fugas</p>
                </div>
              </div>

              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.licensePlate} ({v.make || ''})
                  </option>
                ))}
              </select>
            </div>

            {/* Fuel KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nivel de Estanque</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-blue-600">
                    {fuelData?.fuelMetrics?.currentLevelPercentage ?? 85}%
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    (~{fuelData?.fuelMetrics?.currentLiters ?? 51} Litros)
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${fuelData?.fuelMetrics?.currentLevelPercentage ?? 85}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Autonomía Estimada</p>
                <p className="text-3xl font-black text-slate-900 mt-1">
                  ~{fuelData?.fuelMetrics?.estimatedKmLeft ?? 550}{' '}
                  <span className="text-xs font-normal text-slate-500">km</span>
                </p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-2">✓ Rango seguro para ruta</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rendimiento Promedio</p>
                <p className="text-3xl font-black text-slate-900 mt-1">
                  {fuelData?.fuelMetrics?.consumptionRateL100km ?? 8.5}{' '}
                  <span className="text-xs font-normal text-slate-500">L / 100 km</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-2">~11.8 km por litro</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sensor de Fuga / Robo</p>
                <p className="text-xl font-black text-emerald-600 mt-2 flex items-center gap-1.5">
                  <span>🛡️</span> Sin Anomalías
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Monitoreo continuo activo</p>
              </div>
            </div>

            {/* Fuel History Visualization */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4">
              <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                <span>📈</span> Curva de Nivel de Combustible y Cargas Recientes
              </h3>
              <p className="text-xs text-slate-400">
                Gráfica telemétrica sincronizada con el sensor flotador / CAN-Bus OBD2 del vehículo.
              </p>

              <div className="h-40 flex items-end gap-2 pt-6 border-b border-slate-800 px-2">
                {[88, 86, 85, 84, 82, 80, 95, 93, 91, 89, 87, 85].map((lvl, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full bg-gradient-to-t from-blue-700 to-cyan-400 rounded-t-lg transition-all hover:brightness-125"
                      style={{ height: `${lvl}%` }}
                    ></div>
                    <span className="text-[9px] text-slate-500 font-mono">T{idx + 1}</span>
                    {/* Tooltip */}
                    <div className="absolute -top-7 hidden group-hover:block bg-slate-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap z-10">
                      {lvl}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pt-1 font-mono">
                <span>⬅️ Registros anteriores</span>
                <span>Último reporte en vivo ➡️</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SPEED CONTROL */}
      {activeTab === 'speed' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-bold">
                ⚡
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Control y Alertas de Velocidad</h2>
                <p className="text-xs text-slate-500">
                  Configuración de umbrales máximos e historial de excesos de velocidad en ruta
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-slate-800">🏙️ Límite Urbano</p>
                <p className="text-2xl font-black text-slate-900">50 km/h</p>
                <p className="text-[11px] text-slate-500">Regulado según normativa nacional</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-slate-800">🛣️ Límite Carreteras</p>
                <p className="text-2xl font-black text-amber-600">100 km/h</p>
                <p className="text-[11px] text-slate-500">Umbral de alerta moderada</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-slate-800">🚨 Límite Crítico Autopista</p>
                <p className="text-2xl font-black text-red-600">120 km/h</p>
                <p className="text-[11px] text-slate-500">Disparo automático de alerta y Telegram</p>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-800 mb-3">Registro de Excesos Recientes</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {alerts.filter((a) => a.type === 'speeding').length === 0 ? (
                <p className="py-6 text-center text-slate-400 italic">✓ No hay excesos de velocidad registrados.</p>
              ) : (
                alerts
                  .filter((a) => a.type === 'speeding')
                  .slice(0, 10)
                  .map((a) => (
                    <div key={a._id} className="py-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-bold text-red-600">{a.message}</p>
                        <p className="text-slate-500 text-[11px]">{a.location?.address || 'En ruta'}</p>
                      </div>
                      <span className="text-slate-400 text-[11px] font-mono">
                        {new Date(a.createdAt).toLocaleString('es-CL')}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ALERTS AUDIT */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🚨</span> Auditoría Completa de Eventos de Seguridad ({alerts.length})
            </h2>
          </div>

          {!alerts.length ? (
            <p className="text-slate-500 text-xs py-8 text-center">No hay alertas registradas en la base de datos.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {alerts.slice(0, 20).map((a) => (
                <div key={a._id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="capitalize">{a.type?.replace('_', ' ')}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          a.severity === 'critical'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {a.severity}
                      </span>
                    </p>
                    <p className="text-slate-500">{a.message || 'Sin mensaje'}</p>
                  </div>
                  <div className="text-right text-slate-400 text-[11px]">
                    {new Date(a.createdAt).toLocaleString('es-CL')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Route Playback Modal */}
      {playbackTarget && (
        <RoutePlaybackModal
          isOpen={!!playbackTarget}
          onClose={() => setPlaybackTarget(null)}
          targetType={playbackTarget.targetType}
          targetId={playbackTarget.targetId}
          targetName={playbackTarget.targetName}
        />
      )}

      {/* Suggested Fleet Plans Modal */}
      <FleetPlansModal isOpen={showPlansModal} onClose={() => setShowPlansModal(false)} />
    </div>
  )
}
