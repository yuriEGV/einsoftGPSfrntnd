import React from 'react'

export default function DownloadApp() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header Táctico EYE-NODE */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden border border-cyan-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-black uppercase tracking-wider">
            ⚡ EYE-NODE // TRACKER 360 • Nodo de Inteligencia Móvil
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            EYE-NODE / TRACKER 360 (APK Táctica)
          </h1>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            Más que un simple GPS: un <strong>Nodo de Inteligencia Táctica</strong> que monitorea en 360° la posición multi-constelación (GNSS 4-Band), física de movimiento (IMU 6-Ejes, Fuerza G, Choque/Impacto, Vuelco), comportamiento del conductor con IA, Centinela anti-manipulación y Caja Negra offline.
          </p>
        </div>
      </div>

      {/* Sensor Architecture Diagram */}
      <div className="bg-slate-950 rounded-3xl p-6 border border-cyan-900/40 text-slate-200 shadow-xl space-y-4">
        <h2 className="text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <span>📐</span> Arquitectura de Sensores Fusión 360°
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300 font-extrabold text-sm">
              <span>🛰️</span> 1. GNSS 4-Band + A-GNSS
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              GPS, Galileo, GLONASS y BeiDou con respaldo inteligente por WiFi y Cell ID en túneles o subterráneos.
            </p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-sm">
              <span>🏎️</span> 2. IMU 6/9-Ejes & Física G
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Acelerómetro y Giroscopio para detección instantánea de frenadas bruscas, aceleración, curvas, choques y vuelco.
            </p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-extrabold text-sm">
              <span>🛡️</span> 3. Centinela Anti-Tamper
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Vigilancia de manipulación en reposo. Alerta inmediata si el activo es movido o tocado sin autorización.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Descarga de APK */}
        <div className="bg-white rounded-3xl p-6 border-2 border-cyan-100 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-2xl">
              📲
            </div>
            <h2 className="text-xl font-black text-slate-900">1. Descargar APK EYE-NODE 360</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Instalador nativo para Android. Incluye telemetría táctica en segundo plano, soporte de caja negra offline y sincronización automática.
            </p>
            
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2.5">
              <p className="font-bold text-slate-800">📋 Activación en 1 toque:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px]">
                <li>Descarga e instala el archivo <code>.apk</code> en el teléfono.</li>
                <li>Abre la app y selecciona el perfil (ej: <strong>Manuel</strong>, <strong>Yuri</strong>, <strong>Gloria</strong>, <strong>Sarem</strong>).</li>
                <li>Concede los permisos de Ubicación y Sensores.</li>
                <li>Verás la pantalla táctica en <strong>🟢 EN LÍNEA</strong> transmitiendo telemetría 360.</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <a
              href="/einsoft-gps.apk"
              download="eyenode-tracker360.apk"
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold rounded-2xl text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/25 transition-all active:scale-95 text-sm"
            >
              📥 Descargar APK EYE-NODE 360 (.apk)
            </a>

            <a
              href="/mobile-gps"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-bold rounded-2xl text-center flex items-center justify-center gap-2 transition-all active:scale-95 text-xs shadow border border-slate-800"
            >
              🚀 O Probar Nodo Web en Navegador Móvil
            </a>
          </div>
        </div>

        {/* Card 2: Monitoreo en Consola Central */}
        <div className="bg-white rounded-3xl p-6 border-2 border-purple-100 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-2xl">
              🗺️
            </div>
            <h2 className="text-xl font-black text-slate-900">2. Consola de Monitoreo Central</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Visualiza en tiempo real en el mapa la ubicación satelital calzada a calles, trazas históricas multi-color, estado de pánico y eventos telemétricos.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2.5">
              <p className="font-bold text-slate-800">📊 Capacidades del Centro de Comando:</p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-600 text-[11px]">
                <li>Rastreo Multi-Color por cada persona/móvil registrado.</li>
                <li>Enrutamiento OSRM calzado a autopistas y calles reales.</li>
                <li>Notificaciones SOS inmediatas con botón de silenciado general.</li>
                <li>Recepción de alertas de choque e impactos detectados por los nodos.</li>
              </ul>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/people-tracker"
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl text-center flex items-center justify-center gap-2 shadow-lg shadow-purple-900/25 transition-all active:scale-95 text-sm"
            >
              👥 Abrir Panel de Rastreo en Vivo
            </a>
          </div>
        </div>
      </div>

      {/* Connection Endpoint Banner */}
      <div className="bg-slate-950 text-slate-200 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-3">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          🛰️ Servidor Oficial de Telemetría Táctica
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Los nodos EYE-NODE 360 transmiten sus paquetes de telemetría directamente con protocolo de baja latencia:
        </p>

        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Punto de Enlace API</span>
            <code className="text-cyan-400 font-mono font-bold select-all block mt-0.5">
              https://einsoft-gp-sbcknd.vercel.app/api/telemetry
            </code>
          </div>
          <span className="text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
            🟢 Servidor Operacional
          </span>
        </div>
      </div>
    </div>
  )
}
