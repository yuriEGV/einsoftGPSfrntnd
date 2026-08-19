import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { apiClient } from '../services/api'
import { telemetryClient } from '../services/telemetryClient'
import { getDeviceConnectionStatus } from '../utils/deviceState'

export default function PublicPersonTracker() {
  const { code } = useParams()
  const [person, setPerson] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isPanicActive, setIsPanicActive] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [offlineCount, setOfflineCount] = useState(0)
  const [telemetry, setTelemetry] = useState(null)
  const [lastPacketTime, setLastPacketTime] = useState(null)

  // 1. Fetch initial public details for this code
  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiClient.get(`/people-trackers/public/${code}`)
        setPerson(res.data)
        if (res.data?.status === 'panic' || res.data?.panicAlert?.active) {
          setIsPanicActive(true)
        }
      } catch (err) {
        setError('No se encontró el perfil de rastreo para este código.')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [code])

  // 2. Start Telemetry Client for this tracker code
  useEffect(() => {
    if (!code) return

    telemetryClient.start({
      deviceId: code,
      trackerCode: code,
    })

    const unsubscribe = telemetryClient.subscribe((event) => {
      if (event.type === 'telemetry_sample') {
        setTelemetry(event.sample)
      } else if (event.type === 'packet_sent') {
        setLastPacketTime(new Date())
        setSentCount((c) => c + 1)
        setOfflineCount(telemetryClient.getOfflineQueueCount())
      } else if (event.type === 'offline_queue_updated') {
        setOfflineCount(event.count)
      } else if (event.type === 'sync_completed') {
        setOfflineCount(0)
        setLastPacketTime(new Date())
      }
    })

    return () => {
      unsubscribe()
      telemetryClient.stop()
    }
  }, [code])

  // Connection status calculation
  const connStatus = getDeviceConnectionStatus(lastPacketTime)

  // 4. Handle Panic SOS button click
  const handlePanicToggle = async () => {
    const nextState = !isPanicActive
    setIsPanicActive(nextState)

    try {
      let lat = lastLocation?.latitude
      let lng = lastLocation?.longitude

      if (!lat && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((p) => {
          lat = p.coords.latitude
          lng = p.coords.longitude
        })
      }

      await apiClient.post(`/people-trackers/public/${code}/panic`, {
        active: nextState,
        message: nextState ? '🚨 ¡BOTÓN DE PÁNICO PRESIONADO EN CELULAR!' : 'Alarma cancelada',
        latitude: lat,
        longitude: lng,
      })
    } catch (err) {
      alert('Error al enviar la señal de pánico. Revisa tu conexión a internet.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-bold text-sm text-purple-200">Cargando Rastreador Personal...</p>
        </div>
      </div>
    )
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800 p-6 rounded-2xl max-w-sm text-center space-y-3 border border-slate-700">
          <span className="text-4xl">⚠️</span>
          <h2 className="font-bold text-lg">Código de Rastreo Inválido</h2>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 max-w-md mx-auto relative overflow-hidden">
      {/* Background glow when in Panic */}
      {isPanicActive && (
        <div className="absolute inset-0 bg-red-600/30 animate-pulse pointer-events-none z-0" />
      )}

      {/* Header */}
      <div className="relative z-10 pt-4 text-center space-y-2">
        <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-[11px] font-bold uppercase tracking-widest">
          📱 Rastreador Personal Activo
        </span>
        <h1 className="text-2xl font-black italic">{person.name}</h1>
        <p className="text-xs text-slate-400">{person.roleDescription}</p>
      </div>

      {/* Center: BIG SOS PANIC BUTTON */}
      <div className="relative z-10 my-auto py-8 text-center space-y-6">
        <button
          onClick={handlePanicToggle}
          className={`w-52 h-52 mx-auto rounded-full font-black text-xl flex flex-col items-center justify-center shadow-2xl transition-all active:scale-95 border-4 ${
            isPanicActive
              ? 'bg-red-600 border-red-400 text-white shadow-red-600/60 animate-bounce'
              : 'bg-gradient-to-b from-red-500 to-red-700 border-red-400 text-white shadow-red-900/50 hover:scale-105'
          }`}
        >
          <span className="text-4xl mb-1">{isPanicActive ? '🚨' : '🆘'}</span>
          <span>{isPanicActive ? 'EN PÁNICO' : 'PÁNICO SOS'}</span>
          <span className="text-[10px] font-normal opacity-90 mt-1 uppercase tracking-wider">
            {isPanicActive ? 'Presiona para Cancelar' : 'Toca para pedir auxilio'}
          </span>
        </button>

        {isPanicActive ? (
          <div className="bg-red-900/80 border border-red-500 p-3 rounded-2xl text-center space-y-1">
            <p className="font-extrabold text-sm text-red-200">🚨 ALERTA DE EMERGENCIA ACTIVADA</p>
            <p className="text-xs text-red-300">
              Tus coordenadas están siendo enviadas en tiempo real a la central de monitoreo.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Usa el botón **PÁNICO SOS** únicamente en situaciones de peligro o emergencia.
          </p>
        )}
      </div>

      {/* Footer Controls */}
      <div className="relative z-10 space-y-3 pb-4">
        {/* Live transmission toggle */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-xs text-slate-200">Transmitir GPS Continuo</p>
            <p className="text-[10px] text-slate-400">Paquetes enviados: {sentCount}</p>
          </div>
          <button
            onClick={() => setIsTransmitting(!isTransmitting)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              isTransmitting ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {isTransmitting ? '🟢 Activo' : '🔴 Pausado'}
          </button>
        </div>

        {/* Device Metrics */}
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <span className="text-slate-400 block text-[10px]">Batería del Teléfono</span>
            <span className="font-bold text-emerald-400">🔋 {batteryLevel}%</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <span className="text-slate-400 block text-[10px]">Señal GPS</span>
            <span className="font-bold text-purple-400">
              {lastLocation ? `🎯 ±${Math.round(lastLocation.accuracy)}m` : 'Buscando...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
