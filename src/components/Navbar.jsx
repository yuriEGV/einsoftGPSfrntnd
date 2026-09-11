import React from 'react'

export default function Navbar({ toggleSidebar }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  return (
    <nav className="bg-[#0a0f1d] border-b border-slate-800/80 px-4 md:px-8 py-3.5 text-slate-200">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="mr-4 md:hidden text-slate-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <h2 className="text-sm font-bold tracking-wide uppercase font-mono text-slate-200 truncate">
              Centro de Monitoreo & Seguridad Telemática
            </h2>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <a
            href="/download-app"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all shadow-md active:scale-95"
          >
            <span>📱</span> Descargar APK v2.3
          </a>
          <a
            href="https://t.me/EinGpsBot"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition-all shadow-xs"
          >
            <span className="text-cyan-400">🤖</span> Bot @EinGpsBot
          </a>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <span className="text-slate-500">SESIÓN:</span>
            <span className="text-slate-200 font-semibold">{user.name || user.email || 'Operador Central'}</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
