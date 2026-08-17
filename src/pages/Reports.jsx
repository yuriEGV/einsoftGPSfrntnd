import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { apiClient } from '../services/api'

export default function Reports() {
  const [activeTab, setActiveTab] = useState('ai') // 'ai' | 'vehicle' | 'alerts'
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [period, setPeriod] = useState('weekly')

  // AI Diagnostic State
  const [aiReport, setAiReport] = useState(null)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)

  // Vehicles Query
  const { data: vehicles = [] } = useQuery('reports-vehicles', async () => {
    const response = await apiClient.get('/vehicles')
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

  const handleGenerateVehicleReport = (e) => {
    e.preventDefault()
    if (!selectedVehicleId) return
    refetchReport()
  }

  const handleGenerateAiReport = async () => {
    setIsGeneratingAi(true)
    try {
      const res = await apiClient.post('/reports/ai-summary', {
        prompt: 'Genera un diagnóstico ejecutivo y completo de la flota de vehículos y personas rastreadas. Incluye métricas de seguridad, recomendaciones de ahorro de combustible y análisis de eventos de pánico u offline.',
      })
      setAiReport(res.data.analysis)
    } catch (err) {
      alert('Error generando diagnóstico IA: ' + (err.response?.data?.error || err.message))
    } finally {
      setIsGeneratingAi(false)
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
      ['Puntos de registro', report.metrics.tripCount]
    ]

    const csvContent = [
      headers.join(','),
      ...metrics.map(row => row.join(','))
    ].join('\n')

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
  const activeCount = vehicles.filter(v => v.status === 'active').length
  const offlineCount = vehicles.filter(v => v.status === 'offline').length
  const totalVehicles = vehicles.length
  const safetyScore = totalVehicles > 0 ? Math.max(70, Math.round(100 - (alerts.length * 3))) : 100

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
              Análisis ejecutivo en tiempo real de tu flota, comportamiento de conducción y recomendaciones automáticas por Inteligencia Artificial.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 no-print">
            <button
              onClick={handleGenerateAiReport}
              disabled={isGeneratingAi}
              className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-2xl text-xs shadow-xl shadow-purple-600/30 transition-all transform hover:scale-105 flex items-center gap-2 disabled:opacity-50"
            >
              {isGeneratingAi ? (
                <>
                  <span className="animate-spin">⏳</span> Generando Análisis IA...
                </>
              ) : (
                <>
                  <span>✨</span> Generar Diagnóstico IA con Gemini
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-xs border border-slate-700 transition-colors flex items-center gap-2"
            >
              🖨️ Imprimir Reporte
            </button>
          </div>
        </div>

        {/* Executive KPI Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-purple-800/40">
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-500/10">
            <p className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">Flota Registrada</p>
            <p className="text-2xl font-black text-white mt-1">{totalVehicles} <span className="text-xs font-normal text-slate-400">vehículos</span></p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-500/10">
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Vehículos Activos</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{activeCount} <span className="text-xs font-normal text-emerald-300/70">en línea</span></p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-500/10">
            <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Índice de Seguridad</p>
            <p className="text-2xl font-black text-amber-300 mt-1">{safetyScore}/100 <span className="text-xs font-normal text-amber-200/70">excelente</span></p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-500/10">
            <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Alertas Registradas</p>
            <p className="text-2xl font-black text-red-400 mt-1">{alerts.length} <span className="text-xs font-normal text-red-300/70">eventos</span></p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 no-print">
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-5 py-3 font-bold text-xs rounded-t-2xl transition-all flex items-center gap-2 ${
            activeTab === 'ai'
              ? 'bg-purple-900 text-purple-100 border-t-2 border-purple-500 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          🧠 Diagnóstico Inteligente Gemini IA
        </button>
        <button
          onClick={() => setActiveTab('vehicle')}
          className={`px-5 py-3 font-bold text-xs rounded-t-2xl transition-all flex items-center gap-2 ${
            activeTab === 'vehicle'
              ? 'bg-blue-900 text-blue-100 border-t-2 border-blue-500 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          📊 Reporte por Vehículo & Periodo
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-5 py-3 font-bold text-xs rounded-t-2xl transition-all flex items-center gap-2 ${
            activeTab === 'alerts'
              ? 'bg-red-900 text-red-100 border-t-2 border-red-500 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          🚨 Registro de Alertas y Auditoría
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
                  Haz click en el botón a continuación para que Gemini analice el estado actual de tus vehículos, velocidades y eventos de seguridad.
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

      {/* TAB 2: VEHICLE SPECIFIC REPORT */}
      {activeTab === 'vehicle' && (
        <div className="space-y-6">
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
                  {vehicles.map(v => (
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
                    Conductor Asignado: <span className="font-semibold text-slate-800">{report.vehicle.driver || 'Sin asignar'}</span> · {report.vehicle.make} {report.vehicle.model}
                  </p>
                </div>

                <div className="flex gap-2 no-print">
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
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-3">Recorrido y Distancia</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-600">Distancia Estimada:</span>
                      <span className="font-bold text-blue-600 text-sm">{report.metrics.estimatedDistanceKm || report.metrics.totalDistance || 0} km</span>
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
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-3">Velocidad y Comportamiento</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-600">Velocidad Promedio:</span>
                      <span className="font-bold text-slate-800">{report.metrics.averageSpeed} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Velocidad Máxima Alcanzada:</span>
                      <span className={`font-bold ${Number(report.metrics.maxSpeed) > 120 ? 'text-red-600' : 'text-slate-800'}`}>
                        {report.metrics.maxSpeed} km/h
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-3">Alertas Registradas</h3>
                  {report.alertsCount === 0 ? (
                    <p className="text-emerald-600 font-semibold italic">✓ Sin alertas registradas en este periodo.</p>
                  ) : (
                    <div className="space-y-1">
                      {Object.entries(report.alertsByType || {}).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center text-xs">
                          <span className="capitalize text-slate-600">{type.replace('_', ' ')}:</span>
                          <span className="font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{count}</span>
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

      {/* TAB 3: ALERTS AUDIT */}
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
              {alerts.slice(0, 20).map(a => (
                <div key={a._id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="capitalize">{a.type?.replace('_', ' ')}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        a.severity === 'critical' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
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
    </div>
  )
}
