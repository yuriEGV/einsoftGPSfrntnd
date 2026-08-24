import React, { useState, useEffect } from 'react'

export const CURRENT_CLIENT_VERSION = '2.0.0'

export default function UpdateNotificationModal({ serverUrl = 'https://einsoft-gp-sbcknd.vercel.app/api' }) {
  const [updateInfo, setUpdateInfo] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    async function checkVersion() {
      try {
        const baseUrl = serverUrl.replace(/\/telemetry\/?$/, '').replace(/\/$/, '')
        const res = await fetch(`${baseUrl}/app-version`, { signal: AbortSignal.timeout(4000) })
        if (res.ok) {
          const data = await res.json()
          // Check if installed version is older
          const isOlder = checkIsOlder(CURRENT_CLIENT_VERSION, data.latestVersion)
          const lastDismissedVer = localStorage.getItem('einsoft_dismissed_update_version')
          
          if (isOlder && lastDismissedVer !== data.latestVersion) {
            setUpdateInfo(data)
          }
        }
      } catch (_) {
        // Offline or backend unreachable, ignore
      }
    }

    checkVersion()
    const timer = setInterval(checkVersion, 1000 * 60 * 15) // Check every 15 min
    return () => clearInterval(timer)
  }, [serverUrl])

  function checkIsOlder(current, latest) {
    if (!latest) return false
    if (current === latest) return false
    // Compare semantic versions (e.g. 1.0.0 vs 2.0.0)
    const [c1 = 0, c2 = 0, c3 = 0] = String(current).split('.').map(Number)
    const [l1 = 0, l2 = 0, l3 = 0] = String(latest).split('.').map(Number)
    if (l1 > c1) return true
    if (l1 === c1 && l2 > c2) return true
    if (l1 === c1 && l2 === c2 && l3 > c3) return true
    return false
  }

  const handleDismiss = () => {
    if (updateInfo?.latestVersion) {
      localStorage.setItem('einsoft_dismissed_update_version', updateInfo.latestVersion)
    }
    setDismissed(true)
  }

  const handleUpdate = () => {
    setIsUpdating(true)
    // If APK download URL exists, trigger download
    if (updateInfo?.apkUrl) {
      const a = document.createElement('a')
      a.href = updateInfo.apkUrl
      a.download = 'eyenode-tracker360.apk'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    
    // Clear old app cache and force refresh after a brief delay
    setTimeout(() => {
      try {
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name))
          })
        }
      } catch (_) {}
      window.location.reload(true)
    }, 1500)
  }

  if (!updateInfo || dismissed) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[999] p-3 sm:p-4 flex justify-center animate-in slide-in-from-top-4 duration-300">
      <div className="w-full max-w-md bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border-2 border-cyan-400/80 rounded-2xl p-4 shadow-[0_10px_35px_rgba(6,182,212,0.4)] text-white relative">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-xl shrink-0 animate-bounce">
            🚀
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-950 border border-cyan-500/60 rounded text-cyan-300 font-bold uppercase">
                Nueva Actualización v{updateInfo.latestVersion}
              </span>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white text-xs font-bold px-1"
                title="Cerrar aviso"
              >
                ✕
              </button>
            </div>

            <h3 className="text-sm font-black text-white">
              {updateInfo.releaseName || 'EYE-NODE // TRACKER 360'}
            </h3>
            <p className="text-[11px] text-slate-300 leading-snug">
              Hay una nueva versión del sistema con IMU 360, Modo Centinela y detección de choques.
            </p>

            {/* Feature bullets */}
            {updateInfo.features && Array.isArray(updateInfo.features) && (
              <ul className="text-[10px] text-cyan-200/90 font-mono space-y-0.5 pt-1">
                {updateInfo.features.slice(0, 3).map((feat, i) => (
                  <li key={i} className="truncate">✓ {feat}</li>
                ))}
              </ul>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>📥</span>
                <span>{isUpdating ? 'Actualizando...' : 'Actualizar e Instalar Ahora'}</span>
              </button>

              <button
                onClick={handleDismiss}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 transition"
              >
                Más tarde
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
