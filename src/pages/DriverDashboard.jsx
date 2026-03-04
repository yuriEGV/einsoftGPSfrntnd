import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'react-query'
import { apiClient } from '../services/api'

export default function DriverDashboard() {
    const [speed, setSpeed] = useState(0)
    const [status, setStatus] = useState('offline')
    const user = JSON.parse(localStorage.getItem('user') || '{}')

    // Fetch own vehicle data
    const { data: vehicle, refetch } = useQuery('driver-vehicle', async () => {
        // Assuming driver is linked to a vehicle or we find the one assigned
        const response = await apiClient.get('/vehicles')
        // For demo simplicity, take the first one where this user is driver or just the first available
        return response.data[0]
    })

    // Panic Button Mutation
    const panicMutation = useMutation(async () => {
        if (!vehicle) return
        return apiClient.post(`/sensors/upload`, {
            deviceIMEI: vehicle.deviceIMEI,
            gps: vehicle.location?.coordinates ? {
                latitude: vehicle.location.coordinates[1],
                longitude: vehicle.location.coordinates[0],
                speed: speed
            } : null,
            alarmSensor: { panicButton: true }
        })
    })

    const handlePanic = () => {
        if (window.confirm('¿ENVIAR ALERTA DE PÁNICO?')) {
            panicMutation.mutate()
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-between">
            {/* Header */}
            <div className="w-full flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div>
                    <h1 className="text-xl font-bold">Driver: {user.name}</h1>
                    <p className="text-xs text-slate-400">VEHÍCULO: {vehicle?.licensePlate || 'Cargando...'}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${vehicle ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`} />
            </div>

            {/* Speedometer Area */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="relative w-64 h-64 flex items-center justify-center border-8 border-slate-800 rounded-full bg-slate-900 shadow-2xl">
                    <div className="text-center">
                        <span className="text-8xl font-black block">{vehicle?.speed || 0}</span>
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-sm">KM/H</span>
                    </div>
                    {/* Decorative speed arc */}
                    <div className="absolute inset-0 border-t-8 border-blue-500 rounded-full animate-pulse opacity-50" />
                </div>
                <p className="text-slate-500 font-medium">ESTADO: <span className="text-blue-400 font-bold">EN RUTA</span></p>
            </div>

            {/* Emergency Button */}
            <div className="w-full space-y-4 pb-8">
                <button
                    onClick={handlePanic}
                    disabled={panicMutation.isLoading}
                    className="w-full aspect-square md:aspect-auto md:h-24 bg-red-600 hover:bg-red-700 active:scale-95 transition-all rounded-3xl flex flex-col items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.4)] border-b-8 border-red-800"
                >
                    <span className="text-5xl mb-1">🆘</span>
                    <span className="text-2xl font-black tracking-tighter">PÁNICO</span>
                </button>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
                        <span className="block text-xs text-slate-500 mb-1">MOTOR</span>
                        <span className="text-lg font-bold text-green-400">ACTIVO</span>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
                        <span className="block text-xs text-slate-500 mb-1">MICRÓFONO</span>
                        <span className="text-lg font-bold text-slate-400">LISTO</span>
                    </div>
                </div>
            </div>

            {/* Footer Info */}
            <div className="w-full text-center text-[10px] text-slate-600 uppercase tracking-widest">
                Sistema de Seguridad Einsoft GPS • Conduzca con precaución
            </div>
        </div>
    )
}
