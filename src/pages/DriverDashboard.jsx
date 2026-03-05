import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'react-query'
import { apiClient } from '../services/api'

export default function DriverDashboard({ onLogout }) {
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}')
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    // Fetch assigned vehicle — compare all possible ID fields correctly
    const { data: vehicle, refetch } = useQuery('driver-vehicle', async () => {
        const response = await apiClient.get('/vehicles')
        const me = user._id || user.id || ''
        return response.data.find(v => {
            const driverId = v.driver?._id?.toString() || v.driver?.toString() || ''
            return driverId === me || driverId === me.toString()
        })
    }, {
        refetchInterval: 8000,
    })

    // Panic Button — calls dedicated /alerts/panic, no IMEI needed
    const panicMutation = useMutation(async () => {
        if (!vehicle) throw new Error('Sin vehículo asignado')
        const coords = vehicle.location?.coordinates
        return apiClient.post('/alerts/panic', {
            vehicleId: vehicle._id,
            latitude: coords ? coords[1] : null,
            longitude: coords ? coords[0] : null,
        })
    })

    const handlePanic = () => {
        panicMutation.mutate()
        if (window.navigator.vibrate) window.navigator.vibrate([100, 30, 100, 30, 100])
    }

    const currentSpeed = vehicle?.speed || 0
    const fuelLevel = vehicle?.sensors?.fuel ?? null
    const safetyScore = 94

    const getFuelColor = (level) => {
        if (level === null) return 'bg-slate-700'
        if (level <= 15) return 'bg-red-500'
        if (level <= 30) return 'bg-orange-500'
        return 'bg-emerald-500'
    }

    const getFuelGlow = (level) => {
        if (level === null) return ''
        if (level <= 15) return 'shadow-[0_0_12px_#ef4444]'
        if (level <= 30) return 'shadow-[0_0_12px_#f97316]'
        return 'shadow-[0_0_12px_#22c55e]'
    }

    return (
        <div className="min-h-screen bg-black text-slate-100 flex flex-col font-sans selection:bg-red-500/30">
            {/* Glass Header */}
            <header className="sticky top-0 z-50 px-6 py-4 bg-slate-900/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 overflow-hidden">
                        {user.profileImage ? (
                            <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-slate-400 font-bold uppercase">{user.name?.charAt(0)}</span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight text-white">{user.name}</h1>
                        <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                            MODO CONDUCTOR •{' '}
                            {vehicle
                                ? <span className="text-emerald-400">{vehicle.licensePlate}</span>
                                : <span className="text-red-400 animate-pulse">SIN VEHÍCULO ASIGNADO</span>
                            }
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-mono text-slate-300">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] text-slate-500 font-medium tracking-widest">GPS</span>
                            <div className={`w-1.5 h-1.5 rounded-full ${vehicle ? 'bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`} />
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="px-6 py-2.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-xl text-[10px] font-black text-red-500 uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-lg shadow-red-900/10"
                    >
                        <span>CERRAR SESIÓN</span>
                        <span className="text-sm">🚪</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-around px-6 py-4">
                {/* Speedometer Cluster */}
                <div className="relative group">
                    <div
                        className="absolute inset-0 rounded-full blur-3xl opacity-10 transition-colors duration-500"
                        style={{ backgroundColor: `hsl(${Math.max(0, 120 - currentSpeed)}, 70%, 50%)` }}
                    />

                    <div className="relative w-72 h-72 rounded-full border-[10px] border-slate-900 bg-slate-950 flex flex-col items-center justify-center shadow-2xl overflow-hidden">
                        {/* Progress ring for Safety Score */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="50%" cy="50%" r="130" className="fill-none stroke-slate-900 stroke-[8px]" />
                            <circle
                                cx="50%" cy="50%" r="130"
                                className="fill-none stroke-[8px] transition-all duration-1000"
                                strokeDasharray="816"
                                strokeDashoffset={816 - (816 * safetyScore / 100)}
                                strokeLinecap="round"
                                style={{ stroke: `hsl(${safetyScore}, 70%, 50%)` }}
                            />
                        </svg>

                        <div className="text-center z-10">
                            <span className="text-[120px] font-black leading-none tracking-tighter text-white tabular-nums drop-shadow-lg">
                                {currentSpeed}
                            </span>
                            <div className="flex flex-col items-center -mt-2">
                                <span className="text-slate-500 font-black tracking-widest text-xs">KM/H</span>
                                <div className="mt-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                        {vehicle ? 'Estado: En Ruta' : 'Sin Vehículo'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Safety Score Badge */}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 rounded-2xl border border-white/10 shadow-xl">
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider text-center mb-0.5">Seguridad</p>
                        <p className="text-sm font-black text-white text-center">{safetyScore}%</p>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="w-full grid grid-cols-2 gap-4 mt-8">
                    {/* Fuel Level Card */}
                    <div className={`col-span-2 bg-slate-900/40 rounded-3xl p-5 border backdrop-blur-md ${fuelLevel !== null && fuelLevel <= 15 ? 'border-red-500/40 animate-pulse' : 'border-white/5'}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${fuelLevel !== null && fuelLevel <= 15 ? 'bg-red-500/30' : 'bg-amber-500/20'}`}>
                                <span className="text-xs">⛽</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Combustible</span>
                            {fuelLevel !== null && fuelLevel <= 15 && (
                                <span className="ml-auto text-[9px] font-black text-red-400 tracking-widest animate-pulse">¡BAJO!</span>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <p className="text-2xl font-bold text-white min-w-[4rem]">
                                {fuelLevel !== null ? `${fuelLevel}%` : '--'}
                            </p>
                            <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${getFuelColor(fuelLevel)} ${getFuelGlow(fuelLevel)}`}
                                    style={{ width: fuelLevel !== null ? `${fuelLevel}%` : '0%' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/40 rounded-3xl p-5 border border-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <span className="text-xs">🛣️</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Odómetro</span>
                        </div>
                        <p className="text-xl font-bold text-white">{vehicle?.odometer || 0} <span className="text-xs text-slate-500">KM</span></p>
                    </div>
                    <div className="bg-slate-900/40 rounded-3xl p-5 border border-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                <span className="text-xs">⚡</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Max Vel.</span>
                        </div>
                        <p className="text-xl font-bold text-white">92 <span className="text-xs text-slate-500">KM/H</span></p>
                    </div>
                </div>
            </main>

            {/* Instant Panic Footer */}
            <footer className="p-6 pb-10">
                {!vehicle ? (
                    <div className="w-full h-24 flex items-center justify-center rounded-3xl bg-slate-900 border border-white/5 text-slate-500 text-sm font-bold tracking-widest uppercase">
                        ⚠️ Sin vehículo asignado — No se puede activar pánico
                    </div>
                ) : (
                    <button
                        onClick={handlePanic}
                        disabled={panicMutation.isLoading}
                        className={`group relative w-full h-24 overflow-hidden rounded-3xl transition-all active:scale-[0.98] ${panicMutation.isSuccess ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                    >
                        {!panicMutation.isLoading && !panicMutation.isSuccess && (
                            <div className="absolute inset-0 bg-red-500 animate-ping opacity-20 pointer-events-none" />
                        )}

                        <div className="relative z-10 flex items-center justify-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl group-active:rotate-12 transition-transform">
                                {panicMutation.isSuccess ? '✅' : panicMutation.isError ? '❌' : '🚨'}
                            </div>
                            <div className="text-left">
                                <span className="block text-xl font-black tracking-tight leading-none text-white uppercase italic">
                                    {panicMutation.isLoading
                                        ? 'Enviando...'
                                        : panicMutation.isSuccess
                                            ? 'Alerta Enviada'
                                            : panicMutation.isError
                                                ? 'Error — Reintentar'
                                                : 'Botón de Pánico'}
                                </span>
                                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                                    {panicMutation.isSuccess
                                        ? 'Central notificada correctamente'
                                        : panicMutation.isError
                                            ? 'Fallo al enviar — toca para reintentar'
                                            : 'Presione en caso de emergencia'}
                                </span>
                            </div>
                        </div>

                        {/* Glossy overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                    </button>
                )}
            </footer>
        </div>
    )
}
