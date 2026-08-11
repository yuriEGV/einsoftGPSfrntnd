import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { apiClient } from '../services/api'

export default function PublicTracker() {
  const { id } = useParams()
  const [isTracking, setIsTracking] = useState(false)
  const [stats, setStats] = useState(null)
  const [sentCount, setSentCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState(null)
  const watchIdRef = useRef(null)

  // Fetch vehicle info
  const { data: vehicle, isLoading } = useQuery(['tracker-vehicle', id], async () => {
    const res = await apiClient.get(`/vehicles/${id}`)
    return res.data
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta GPS.')
      return
    }

    if (!vehicle?.deviceIMEI) {
      alert('⚠️ Este vehículo no tiene un IMEI vinculado. Pídele al administrador que vincule el IMEI en la plataforma.')
      return
    }

    setIsTracking(true)
    setErrorMsg(null)

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const accuracy = Math.round(pos.coords.accuracy)
        const speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude

        setStats({
          lat,
          lng,
          speed,
          accuracy,
          time: new Date().toLocaleTimeString(),
        })

        // Send GPS telemetry to backend
        apiClient.post('/sensors/upload', {
          deviceIMEI: vehicle.deviceIMEI,
          gps: {
            latitude: lat,
            longitude: lng,
            speed: speed,
            heading: pos.coords.heading || 0,
          }
        }).then(() => {
          setSentCount(prev => prev + 1)
        }).catch(err => {
          console.error('Error enviando datos GPS:', err)
        })
      },
      (err) => {
        console.error('Error de GPS:', err)
        setErrorMsg(`Error leyendo GPS: ${err.message}`)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 30000,
      }
    )

    watchIdRef.current = watchId
  }

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <p className="text-sm font-mono animate-pulse">Cargando datos del vehículo...</p>
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-xl font-bold text-red-400">Vehículo no encontrado</p>
          <Link to="/login" className="text-xs text-blue-400 underline">Ir a Inicio de Sesión</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="p-4 bg-slate-900/80 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚗</span>
          <div>
            <h1 className="font-black text-white text-base tracking-wide">{vehicle.licensePlate}</h1>
            <p className="text-[11px] text-slate-400 font-mono">{vehicle.make} {vehicle.model}</p>
          </div>
        </div>
        <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
          isTracking ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse' : 'bg-slate-800 text-slate-400'
        }`}>
          {isTracking ? '🔴 EN RUTA' : '⚪ DETENIDO'}
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col items-center justify-center space-y-6 max-w-md mx-auto w-full">
        {/* Large Control Button */}
        <div className="w-full text-center space-y-4">
          <button
            onClick={isTracking ? stopTracking : startTracking}
            className={`w-full py-6 rounded-3xl font-black text-lg tracking-wider transition-all shadow-2xl flex flex-col items-center justify-center gap-2 ${
              isTracking
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/50 animate-pulse'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-900/40'
            }`}
          >
            <span className="text-3xl">{isTracking ? '⏹️' : '📡'}</span>
            <span>{isTracking ? 'DETENER RASTREO EN RUTA' : 'INICIAR RASTREO EN RUTA'}</span>
            <span className="text-xs font-normal opacity-80">
              {isTracking ? 'Transmitiendo GPS celular...' : 'Presiona para transmitir tu GPS a la consola'}
            </span>
          </button>

          {errorMsg && (
            <div className="bg-red-950/80 border border-red-500/40 text-red-200 text-xs p-3 rounded-xl font-mono">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Live Telemetry Card */}
        {isTracking && stats && (
          <div className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Telemetría en Vivo</span>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800">
                Paquetes: {sentCount}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Velocidad</p>
                <p className="text-2xl font-black text-white font-mono mt-1">{stats.speed} <span className="text-xs font-normal text-slate-400">km/h</span></p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Precisión GPS</p>
                <p className="text-2xl font-black text-emerald-400 font-mono mt-1">±{stats.accuracy}m</p>
              </div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 font-mono text-xs text-slate-300 space-y-1">
              <p><span className="text-slate-500">Latitud:</span> {stats.lat.toFixed(5)}</p>
              <p><span className="text-slate-500">Longitud:</span> {stats.lng.toFixed(5)}</p>
              <p><span className="text-slate-500">Último reporte:</span> {stats.time}</p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="w-full bg-slate-900/30 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
          <p className="font-bold text-slate-300">ℹ️ ¿Cómo funciona esta pantalla?</p>
          <p>
            Al presionar <strong>"INICIAR RASTREO EN RUTA"</strong>, el GPS de este celular transmitirá automáticamente las coordenadas de la ruta hacia la consola central de <strong>Einsoft GPS</strong>.
          </p>
        </div>
      </main>
    </div>
  )
}
