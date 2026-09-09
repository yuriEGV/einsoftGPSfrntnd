import React, { useState } from 'react'

export default function PlannedRoutesModal({ isOpen, onClose, vehicle = null }) {
  const [activeRouteType, setActiveRouteType] = useState('ida') // 'ida' | 'regreso'
  const [routeState, setRouteState] = useState('SIN ACTIVIDAD') // 'SIN ACTIVIDAD' | 'EN RUTA' | 'COMPLETADA'
  const [originName, setOriginName] = useState('Casa')
  const [destinationName, setDestinationName] = useState('Escuela')
  const [waypoints, setWaypoints] = useState([
    { id: 1, name: 'Parada 1: Pasaje Los Cerezos 142', time: '07:15 AM', status: 'completed' },
    { id: 2, name: 'Parada 2: Av. Principal con Los Aromos', time: '07:30 AM', status: 'pending' },
    { id: 3, name: 'Destino: Colegio San Agustín', time: '07:50 AM', status: 'pending' },
  ])
  const [showAddStop, setShowAddStop] = useState(false)
  const [newStopName, setNewStopName] = useState('')

  if (!isOpen) return null

  const unitCode = vehicle?.plate || 'T-100 • AB-CD-12'

  const handleAddStop = (e) => {
    e.preventDefault()
    if (!newStopName.trim()) return
    setWaypoints([
      ...waypoints,
      {
        id: Date.now(),
        name: newStopName,
        time: '08:00 AM',
        status: 'pending',
      },
    ])
    setNewStopName('')
    setShowAddStop(false)
  }

  const toggleRouteStatus = () => {
    if (routeState === 'SIN ACTIVIDAD') {
      setRouteState('EN RUTA')
    } else if (routeState === 'EN RUTA') {
      setRouteState('COMPLETADA')
    } else {
      setRouteState('SIN ACTIVIDAD')
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-100 text-slate-900 w-full max-w-sm rounded-[36px] shadow-2xl overflow-hidden border border-slate-300 flex flex-col max-h-[90vh]">
        
        {/* Header - Matching Image 5 style: Orange background with Unit and Status pill */}
        <div className="bg-amber-500 p-4 pb-5 text-slate-900 flex items-center justify-between shadow-md">
          <div className="space-y-0.5">
            <h3 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-1.5">
              <span>{vehicle?.plate ? `Unidad ${vehicle.plate}` : 'T-100'}</span>
            </h3>
            <span className="text-[11px] font-bold text-amber-950 tracking-wider block font-mono">
              • {vehicle?.plate ? vehicle.plate : 'AB-CD-12'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Status pill matching Image 5 */}
            <button
              onClick={toggleRouteStatus}
              className="bg-white/90 hover:bg-white text-slate-900 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <span className="text-xs">📍</span>
              <span className="text-xs">🚌</span>
              <span className={`w-2 h-2 rounded-full ${routeState === 'EN RUTA' ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              <span>{routeState}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center text-sm font-black transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body - Matching Image 5 cards */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          
          {/* Card 1: RUTA DE IDA (Matching Orange card in Image 5) */}
          <div
            onClick={() => setActiveRouteType('ida')}
            className={`p-6 rounded-3xl transition-all cursor-pointer shadow-lg text-center flex flex-col items-center justify-center gap-2 relative ${
              activeRouteType === 'ida'
                ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white ring-4 ring-orange-300 scale-[1.01]'
                : 'bg-amber-500/80 text-white hover:bg-amber-500'
            }`}
          >
            <span className="bg-white text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
              Próxima Ruta
            </span>

            {/* Right Arrow Icon */}
            <div className="text-4xl font-black my-1 animate-pulse">
              →
            </div>

            <h4 className="text-xl font-black uppercase tracking-wide">
              Ruta de Ida
            </h4>

            <p className="text-xs font-semibold text-amber-100">
              {originName} → {destinationName}
            </p>
          </div>

          {/* Card 2: RUTA DE REGRESO (Matching Grey/neutral card in Image 5) */}
          <div
            onClick={() => setActiveRouteType('regreso')}
            className={`p-6 rounded-3xl transition-all cursor-pointer shadow-sm text-center flex flex-col items-center justify-center gap-2 relative ${
              activeRouteType === 'regreso'
                ? 'bg-slate-300 text-slate-800 ring-4 ring-slate-400 scale-[1.01]'
                : 'bg-slate-200/90 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {/* Left Arrow Icon */}
            <div className="text-4xl font-black my-1 text-slate-600">
              ←
            </div>

            <h4 className="text-xl font-black uppercase tracking-wide text-slate-800">
              Ruta de Regreso
            </h4>

            <p className="text-xs font-semibold text-slate-600">
              {destinationName} → {originName}
            </p>
          </div>

          {/* Waypoints list */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-700 uppercase text-[11px]">
                Paradas de la Ruta ({waypoints.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddStop(!showAddStop)}
                className="text-[11px] text-amber-600 font-extrabold hover:underline"
              >
                + Añadir
              </button>
            </div>

            {showAddStop && (
              <form onSubmit={handleAddStop} className="space-y-2 pt-1">
                <input
                  type="text"
                  value={newStopName}
                  onChange={(e) => setNewStopName(e.target.value)}
                  placeholder="Dirección o punto de control..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs"
                >
                  Guardar Parada
                </button>
              </form>
            )}

            <div className="space-y-1.5 pt-1">
              {waypoints.map((wp, i) => (
                <div key={wp.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px]">
                      {i + 1}
                    </span>
                    <span className="font-medium text-slate-800">{wp.name}</span>
                  </div>
                  <span className="font-mono text-slate-500">{wp.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar - Matching Image 5: 'Ordenar', 'Mapa', 'Agregar' */}
        <div className="bg-white border-t border-slate-200 p-3 flex items-center justify-around text-slate-600 shadow-inner">
          <button
            type="button"
            onClick={() => setWaypoints([...waypoints].reverse())}
            className="flex flex-col items-center gap-1 hover:text-amber-600 transition-colors"
          >
            <span className="text-xl">🔀</span>
            <span className="text-[10px] font-black uppercase tracking-wider">Ordenar</span>
          </button>

          <button
            type="button"
            onClick={() => alert(`Centrando mapa en ruta de ${activeRouteType.toUpperCase()} de la unidad.`)}
            className="flex flex-col items-center gap-1 hover:text-amber-600 transition-colors"
          >
            <span className="text-xl">📍</span>
            <span className="text-[10px] font-black uppercase tracking-wider">Mapa</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddStop(true)}
            className="flex flex-col items-center gap-1 hover:text-amber-600 transition-colors"
          >
            <span className="text-xl">👤➕</span>
            <span className="text-[10px] font-black uppercase tracking-wider">Agregar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
