import React from 'react'

export default function DownloadApp() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <span className="px-3 py-1 bg-blue-500/30 border border-blue-400/40 rounded-full text-xs font-black uppercase tracking-wider text-blue-200">
            📱 Aplicación Móvil Oficial de Telemetría Satelital
          </span>
          <h1 className="text-3xl font-black tracking-tight">EINSoft GPS Tracker (Móvil)</h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Convierte cualquier smartphone (Android o iPhone) en un potente dispositivo GPS de alta precisión con botón de pánico SOS instantáneo y reporte en tiempo real directo a tu plataforma.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: App Oficial EINSoft GPS */}
        <div className="bg-white rounded-3xl p-6 border-2 border-blue-100 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl">
              📱
            </div>
            <h2 className="text-xl font-black text-slate-900">1. App Celular EINSoft GPS</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Diseñada para conductores, supervisores y usuarios en terreno. Incluye medidor de velocidad en vivo, porcentaje de batería real, buffer offline contra pérdida de señal y botón gigante de pánico SOS.
            </p>
            
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2.5">
              <p className="font-bold text-slate-800">📋 Cómo activarla en el celular (1 toque):</p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px]">
                <li>Abre el enlace directo en tu teléfono.</li>
                <li>Presiona <strong>"Permitir"</strong> cuando solicite acceso a la ubicación GPS.</li>
                <li>Escribe tu número o nombre en el campo Identificador (ej: <code>949808788</code>).</li>
                <li>Verás el estado en <strong>🟢 ACTIVO</strong> transmitiendo cada 8-15s.</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <a
              href="/einsoft-gps.apk"
              download="einsoft-gps.apk"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/25 transition-all active:scale-95 text-sm"
            >
              📥 Descargar Archivo APK Nativo (.apk)
            </a>

            <a
              href="/mobile-gps"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-center flex items-center justify-center gap-2 transition-all active:scale-95 text-xs shadow"
            >
              🚀 O Abrir en Navegador Móvil
            </a>
          </div>
        </div>

        {/* Card 2: Rastreo Personal Directo */}
        <div className="bg-white rounded-3xl p-6 border-2 border-purple-100 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-2xl">
              👤
            </div>
            <h2 className="text-xl font-black text-slate-900">2. Rastreo Personal por QR o WhatsApp</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Para monitorear a familiares, adultos mayores o personal específico sin necesidad de contraseñas. Cada persona tiene su propio enlace protegido.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2.5">
              <p className="font-bold text-slate-800">📋 Pasos para enviar el enlace:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px]">
                <li>Entra a la sección <strong>Rastreo Personal</strong> en el menú lateral.</li>
                <li>Pulsa el botón <strong>"📱 Abrir en Celular / QR"</strong> de la persona.</li>
                <li>Envía el link directo por WhatsApp al smartphone de la persona.</li>
                <li>El celular empezará a mostrar su punto satelital en el mapa.</li>
              </ol>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/people-tracker"
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl text-center flex items-center justify-center gap-2 shadow-lg shadow-purple-900/25 transition-all active:scale-95 text-sm"
            >
              👥 Ir a Rastreo Personal
            </a>
          </div>
        </div>
      </div>

      {/* Connection Info */}
      <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-3">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          🛰️ Servidor Oficial de Telemetría EINSoft GPS
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Toda la información viaja encriptada directamente hacia tu servidor central de EINSoft GPS en tiempo real:
        </p>

        <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Punto de Enlace API</span>
            <code className="text-blue-400 font-mono font-bold select-all block mt-0.5">
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
