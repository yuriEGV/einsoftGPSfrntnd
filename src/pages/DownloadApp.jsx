import React from 'react'

export default function DownloadApp() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <span className="px-3 py-1 bg-blue-500/30 border border-blue-400/40 rounded-full text-xs font-black uppercase tracking-wider text-blue-200">
            📱 Aplicación Móvil de Rastreo & Pánico SOS
          </span>
          <h1 className="text-3xl font-black tracking-tight">EINSoft GPS Tracker (Cliente Móvil)</h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Instala la aplicación en los smartphones de tus conductores, trabajadores o familiares para transmitir su ubicación GPS en segundo plano 24/7 y activar alertas de pánico instantáneas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: App Nativa APK Android */}
        <div className="bg-white rounded-3xl p-6 border-2 border-blue-100 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl">
              🤖
            </div>
            <h2 className="text-xl font-black text-slate-900">1. App Nativa Android (APK)</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              La versión nativa cuenta con <strong>Foreground Service permanente</strong>, lo que garantiza que el celular siga transmitiendo coordenadas incluso con la pantalla apagada, el teléfono bloqueado o al reiniciar el dispositivo.
            </p>
            
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-2">
              <p className="font-bold text-slate-800">📋 Pasos para configurar en el teléfono:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                <li>Descarga e instala el archivo <code>.apk</code> directo o desde Play Store.</li>
                <li>Abre la app y concede permisos de <strong>"Ubicación: Permitir siempre"</strong>.</li>
                <li>En <strong>URL del Servidor</strong> ingresa: <br/><code className="text-blue-600 font-bold bg-blue-50 px-1 rounded">https://einsoft-gp-sbcknd.vercel.app/api/telemetry</code></li>
                <li>En <strong>Identificador de Dispositivo</strong> ingresa tu IMEI o ID asignado.</li>
                <li>Activa el switch <strong>"Estado del servicio: Encendido"</strong>.</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <a
              href="https://github.com/traccar/traccar-client-android/releases/download/v8.1/traccar-client-release.apk"
              download
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95 text-sm"
            >
              📥 Descarga Directa de Archivo .APK
            </a>

            <a
              href="https://play.google.com/store/apps/details?id=org.traccar.client"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-center flex items-center justify-center gap-2 border border-slate-700 transition-all text-xs"
            >
              🟢 Descargar desde Google Play Store
            </a>
          </div>
        </div>

        {/* Card 2: App Web Progresiva (PWA 1 Clic) */}
        <div className="bg-white rounded-3xl p-6 border-2 border-purple-100 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-2xl">
              🌐
            </div>
            <h2 className="text-xl font-black text-slate-900">2. Instalación PWA (iOS / Android)</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Funciona al instante sin necesidad de descargas externas. Compatible con cualquier teléfono Android o iPhone.
            </p>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-2">
              <p className="font-bold text-slate-800">📋 Pasos para agregar al celular:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                <li>Abre el enlace en Chrome (Android) o Safari (iPhone).</li>
                <li>Pulsa los <strong>3 puntos</strong> arriba a la derecha (o botón Compartir).</li>
                <li>Selecciona <strong>"Agregar a la pantalla principal"</strong> o <strong>"Instalar"</strong>.</li>
                <li>Se creará un ícono nativo de <strong>EINSoft GPS</strong> en tu teléfono.</li>
              </ol>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/mobile-gps"
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl text-center flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 transition-all active:scale-95 text-sm"
            >
              🚀 Abrir Web App Móvil
            </a>
          </div>
        </div>
      </div>

      {/* Recommended Configuration Box */}
      <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          ⚙️ Parámetros de Conexión del Servidor
        </h3>
        <p className="text-xs text-slate-400">
          Usa estos datos si configuras la app móvil manualmente o utilizas Traccar Client en los celulares:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">URL del Servidor</span>
            <code className="text-blue-400 font-mono font-bold select-all block mt-0.5">
              https://einsoft-gp-sbcknd.vercel.app/api/telemetry
            </code>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Frecuencia Recomendada</span>
            <span className="text-emerald-400 font-bold block mt-0.5">
              Adaptativa (8s en movimiento / 30s detenido)
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
