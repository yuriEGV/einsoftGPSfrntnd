import React from 'react'

export default function FleetPlansModal({ isOpen, onClose }) {
  if (!isOpen) return null

  const plans = [
    {
      name: 'Plan Personal & Familiar',
      badge: 'Básico',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      price: '$4.990',
      period: 'por dispositivo / mes',
      description: 'Ideal para personas, adultos mayores, niños y smartphones individuales.',
      features: [
        '📱 Rastreo en vivo por App / Web',
        '🚨 Botón de Pánico SOS con alerta audible',
        '🔋 Monitoreo de batería y estado en vivo',
        '🗺️ Geocercas circulares y poligonales',
        '📜 Historial de rutas (30 días)',
        '📲 Notificaciones WhatsApp SOS directas',
      ],
      recommended: false,
      buttonText: 'Seleccionar Plan Familiar',
    },
    {
      name: 'Plan Flota Profesional',
      badge: 'Más Popular 🔥',
      badgeColor: 'bg-indigo-100 text-indigo-800',
      price: '$12.990',
      period: 'por vehículo / mes',
      description: 'Solución integral para pymes, flotas de transporte, logística y maquinaria.',
      features: [
        '🚗 Todo lo del Plan Familiar',
        '🛑 Inmovilizador / Corte Remoto de Motor (Seguro)',
        '⛽ Telemetría y Sensor de Combustible (L/100km)',
        '⚡ Alertas de exceso de velocidad configurables',
        '🎞️ Reproductor de Rutas Playback interactivo',
        '✈️ Bot de Telegram para alertas y comandos remotos',
        '📊 Reportes ejecutivos programados por Correo',
      ],
      recommended: true,
      buttonText: 'Contratar Plan Profesional',
    },
    {
      name: 'Plan Enterprise & IA Flota',
      badge: 'Corporativo',
      badgeColor: 'bg-purple-100 text-purple-800',
      price: '$24.990',
      period: 'por vehículo / mes',
      description: 'Para grandes flotas con inteligencia artificial predictiva y mantenimiento.',
      features: [
        '🚀 Todo lo del Plan Profesional',
        '🤖 Copiloto IA Gemini para diagnóstico de flota',
        '🔌 Diagnóstico OBD2 completo (DTCs motor)',
        '📦 API REST & Webhooks para integración ERP/WMS',
        '📈 Análisis predictivo de fallas mecánicas',
        '👨‍💼 Gestor de cuenta dedicado 24/7 y SLA 99.9%',
      ],
      recommended: false,
      buttonText: 'Consultar Plan Enterprise',
    },
  ]

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[99999] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">💎</span>
              <h2 className="text-xl font-black tracking-tight">Planes de Gestión de Flotas EINSoft GPS</h2>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">
              Escalabilidad, seguridad satelital, corte de motor y reportes automatizados adaptados a tu operación.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p, idx) => (
              <div
                key={idx}
                className={`rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 bg-white border ${
                  p.recommended
                    ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20 relative'
                    : 'border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                {p.recommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                    Recomendado para Flotas
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{p.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">{p.price}</span>
                      <span className="text-xs font-semibold text-slate-500">CLP</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">{p.period}</p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Incluye:</p>
                    <ul className="space-y-2">
                      {p.features.map((f, fIdx) => (
                        <li key={fIdx} className="text-xs text-slate-600 flex items-start gap-2">
                          <span className="text-indigo-600 font-bold shrink-0">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => {
                      alert(`Has seleccionado el ${p.name}. Nuestro equipo comercial se comunicará contigo o puedes contactarnos a soporte@einsoftgps.com`)
                      onClose()
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition shadow-sm ${
                      p.recommended
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {p.buttonText}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>🛡️ Facturación mensual con boleta o factura exenta/afecta.</span>
          <span className="font-semibold text-indigo-600">Soporte técnico y telemetría garantizada</span>
        </div>
      </div>
    </div>
  )
}
