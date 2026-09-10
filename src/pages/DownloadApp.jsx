import React from 'react'

export default function DownloadApp() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header Táctico Plataforma Plus & EYE-NODE */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-10 text-white shadow-2xl relative overflow-hidden border border-cyan-500/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-black uppercase tracking-wider">
              ⚡ PLATAFORMA PLUS // APK v2.1.0 (Build 201)
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
              🟢 Verificado & Certificado Ley 21.171
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            EINSoft GPS & EYE-NODE v2.1.0
          </h1>

          <p className="text-sm md:text-base text-slate-300 max-w-3xl leading-relaxed">
            Aplicación oficial de rastreo y seguridad telemática. Incluye el <strong>Botón SOS 3 segundos</strong> con selección de incidentes (Incendio, Semáforo, Robo, Portonazo, Choque, Delincuencia), <strong>Corte Remoto de Combustible</strong> en 1 clic, historial de rutas con reproductor de velocidad, rutas planificadas de Ida/Regreso y telemetría 360°.
          </p>
        </div>
      </div>

      {/* Showcase Visual Gallery */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-2">
          <span>📸</span> Pilares Telemáticos y Funcionalidades v2.1.0
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0b0f19] rounded-2xl overflow-hidden border border-slate-800 p-3 space-y-2 text-white shadow-md">
            <div className="h-44 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center p-1">
              <img
                src="/assets/showcase/location_safety.jpg"
                alt="Location Safety"
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            </div>
            <div className="font-bold text-xs text-cyan-300 font-mono uppercase">1. Location Safety</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Visualización de personas en mapa en vivo, monitoreo de trayectos familiares y geocercas seguras.
            </p>
          </div>

          <div className="bg-[#0b0f19] rounded-2xl overflow-hidden border border-slate-800 p-3 space-y-2 text-white shadow-md">
            <div className="h-44 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center p-1">
              <img
                src="/assets/showcase/driving_safety.jpg"
                alt="Driving Safety"
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            </div>
            <div className="font-bold text-xs text-amber-300 font-mono uppercase">2. Driving Safety</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Monitoreo telemático de aceleración/frenado, sensor IMU y detección automática de colisiones en ruta.
            </p>
          </div>

          <div className="bg-[#0b0f19] rounded-2xl overflow-hidden border border-slate-800 p-3 space-y-2 text-white shadow-md">
            <div className="h-44 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center p-1">
              <img
                src="/assets/showcase/tile_tracking.jpg"
                alt="Tile & Beacons"
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            </div>
            <div className="font-bold text-xs text-emerald-300 font-mono uppercase">3. Tile & Mascotas</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Enlace de balizas Bluetooth Tile para recuperar llaves, activos de valor o rastreo de mascotas.
            </p>
          </div>

          <div className="bg-[#0b0f19] rounded-2xl overflow-hidden border border-slate-800 p-3 space-y-2 text-white shadow-md">
            <div className="h-44 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center p-1">
              <img
                src="/assets/showcase/soc_emergency.jpg"
                alt="Central Receptora 24/7"
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            </div>
            <div className="font-bold text-xs text-red-300 font-mono uppercase">4. Central SOC 24/7</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Botón SOS de 3s, inmovilizador de combustible y enlace inmediato con Carabineros y PDI.
            </p>
          </div>
        </div>
      </div>

      {/* Sensor Architecture Diagram */}
      <div className="bg-slate-950 rounded-3xl p-6 border border-cyan-900/40 text-slate-200 shadow-xl space-y-4">
        <h2 className="text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <span>📐</span> Arquitectura de Sensores Fusión 360° & Protocolos de Reacción
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
              <span>🛡️</span> 3. Centinela Anti-Tamper & GeoParking
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Vigilancia de manipulación en reposo. Alerta inmediata si el activo es remolcado o tocado sin autorización.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Descarga de APK */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-cyan-500/30 shadow-xl space-y-5 flex flex-col justify-between hover:shadow-2xl transition-all">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-3xl">
              📲
            </div>
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-1">
                Versión Oficial 2.1.0 (Build 201)
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Descargar APK Android Oficial
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Instalador compilado para Android con soporte de segundo plano, telemetría táctica, caja negra offline y sincronización automática.
            </p>
            
            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
              <p className="font-bold text-slate-800 dark:text-slate-200">📋 Activación en 1 toque:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                <li>Descarga e instala el archivo <code>.apk</code> en tu teléfono Android.</li>
                <li>Concede los permisos de Ubicación en segundo plano y Sensores de Movimiento.</li>
                <li>Activa la telemetría táctica y el botón SOS de asistencia 24/7.</li>
                <li>Verás la unidad transmitiendo en vivo a la consola central.</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <a
              href="/eyenode.apk"
              download="eyenode.apk"
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black rounded-2xl text-center flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/30 transition-all active:scale-95 text-sm"
            >
              📥 Descargar eyenode.apk v2.1.0 (Nativo Android)
            </a>

            <a
              href="/einsoft-gps.apk"
              download="einsoft-gps.apk"
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl text-center flex items-center justify-center gap-2 transition-all active:scale-95 text-xs shadow border border-slate-700"
            >
              📦 Descarga Alternativa einsoft-gps.apk
            </a>
          </div>
        </div>

        {/* Card 2: Monitoreo en Consola Central */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-purple-500/30 shadow-xl space-y-5 flex flex-col justify-between hover:shadow-2xl transition-all">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-3xl">
              🗺️
            </div>
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 text-[10px] font-black uppercase tracking-wider mb-1">
                Ecosistema Completo
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Plataforma Plus & Centro de Comando
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Visualiza en tiempo real en el mapa la ubicación satelital, histórico de viajes con velocidades, calculador de peajes TAG y certificados Ley 21.171.
            </p>

            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
              <p className="font-bold text-slate-800 dark:text-slate-200">📊 Capacidades Integradas:</p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                <li>Matriz de 18 Módulos telemáticos y financieros.</li>
                <li>Calculador previo de Peajes y TAG de autopistas concesionadas.</li>
                <li>Generador de Certificados de Servicio Ley 21.171 para aseguradoras.</li>
                <li>Notificaciones SOS 24/7 coordinadas con Fuerzas de Seguridad.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <a
              href="/plataforma-plus"
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl text-center flex items-center justify-center gap-2 shadow-xl shadow-purple-900/30 transition-all active:scale-95 text-sm"
            >
              ⚡ Abrir Plataforma Plus (18 Módulos)
            </a>

            <a
              href="/people-tracker"
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl text-center flex items-center justify-center gap-2 transition-all active:scale-95 text-xs shadow border border-slate-700"
            >
              👥 Consola de Rastreo Personal y Celulares
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
