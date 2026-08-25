import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient, safeStorage } from '../services/api'

// Commercial Pricing Plans
const VEHICLE_PLANS = [
  {
    name: 'Plan Particular / Familiar',
    icon: '🚗',
    price: '$9.990',
    period: 'CLP / mes',
    tag: 'Familiar',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    features: [
      '1 vehículo principal incluido',
      'Rastreo satelital en tiempo real',
      'Historial de rutas (30 días)',
      'Alertas de encendido y velocidad',
      'App móvil PWA para toda la familia',
      '+25% por vehículo adicional ($12.488)',
    ],
    highlight: false,
  },
  {
    name: 'Plan Pyme / Flotas Pro',
    icon: '🚀',
    price: '$19.990',
    period: 'CLP / mes por móvil',
    tag: 'Más Popular',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    features: [
      'Rastreo GPS en vivo (actualización 4s)',
      'Historial de viajes 90 días + Playback',
      'Corte de motor remoto y geocercas',
      'Monitoreo de combustible y kilometraje',
      'Reportes ejecutivos en PDF y Excel',
      'Integración con Bot de Telegram 24/7',
    ],
    highlight: true,
  },
  {
    name: 'Plan Corporativo 360',
    icon: '🏢',
    price: '$34.990',
    period: 'CLP / mes por móvil',
    tag: 'Empresarial',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    features: [
      'Todo lo del Plan Pyme Flotas',
      'Telemetría avanzada IMU & Fuerza G',
      'Detección automática de choques e impactos',
      'Modo Centinela anti-manipulación activo',
      'Caja Negra offline de alta redundancia',
      'Soporte técnico dedicado prioritario',
    ],
    highlight: false,
  },
]

const PERSONAL_PLANS = [
  {
    name: 'Protección Personal SOS',
    icon: '👤',
    price: '$4.990',
    period: 'CLP / mes por persona',
    tag: 'Individual',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    features: [
      '1 celular smartphone rastreado',
      'Geolocalización satelital en vivo',
      'Botón de Pánico SOS Instantáneo',
      'Sirena sonora y síntesis de voz',
      'Monitoreo de nivel de batería %',
      'Enlace privado directo para WhatsApp',
    ],
    highlight: false,
  },
  {
    name: 'Pack Familiar 360',
    icon: '👨‍👩‍👧‍👦',
    price: '$9.990',
    period: 'CLP / mes (hasta 3 personas)',
    tag: 'Recomendado',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    features: [
      'Hasta 3 familiares / teléfonos incluidos',
      'Botón de Pánico SOS con mapa satelital',
      'Alertas directas a Telegram de la familia',
      'Historial de desplazamientos 30 días',
      'Sin contratos de permanencia',
    ],
    highlight: true,
  },
  {
    name: 'Seguridad & Cuadrillas',
    icon: '🛡️',
    price: '$24.990',
    period: 'CLP / mes (hasta 10 personas)',
    tag: 'Guardias & Terreno',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    features: [
      'Hasta 10 trabajadores de campo / guardias',
      'Panel centralizado de emergencias SOS',
      'Mapa táctico con actualización en tiempo real',
      'Registro de rondas y puntos de control',
      'Reporte de asistencia y cobertura',
    ],
    highlight: false,
  },
]

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activePlanCategory, setActivePlanCategory] = useState('vehicles') // 'vehicles' | 'people'
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      })

      safeStorage.set('token', response.data.token)
      safeStorage.set('refreshToken', response.data.refreshToken)
      safeStorage.set('user', JSON.stringify(response.data.user))

      onLogin()
      const role = response.data.user.role
      if (role === 'driver') {
        navigate('/driver')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciales inválidas. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const currentPlans = activePlanCategory === 'vehicles' ? VEHICLE_PLANS : PERSONAL_PLANS

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 font-sans flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* ── Top Navigation Header ── */}
      <header className="bg-slate-950/80 border-b border-slate-800/80 px-6 py-4 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/25">
            🛰️
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-white">
              EINSoft <span className="text-cyan-400">GPS</span>
            </h1>
            <p className="text-[10px] font-mono text-slate-400">
              Plataforma Integral de Telemetría Vehicular y Nodos Móviles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/download-app"
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
          >
            <span>📥</span> Descargar EYE-NODE APK
          </a>
          <a
            href="https://t.me/EinGpsBot"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-xl items-center gap-1.5 transition"
          >
            <span>🤖</span> Bot @EinGpsBot
          </a>
        </div>
      </header>

      {/* ── Main Hero & Dual Login / Pricing Section ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Left Column: Commercial Solutions & Pricing ── */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-bold rounded-full font-mono">
              ⚡ GESTIÓN PROFESIONAL 360
            </span>
            <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
              Control total de flotas corporativas y protección familiar en vivo
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Monitoreo satelital de alta precisión, sensor de impacto IMU, geocercas inteligentes y botón de pánico SOS conectado a Telegram.
            </p>
          </div>

          {/* Plan Category Switcher */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl w-fit">
            <button
              onClick={() => setActivePlanCategory('vehicles')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                activePlanCategory === 'vehicles'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🚗 Rastreo Vehicular & Flotas
            </button>
            <button
              onClick={() => setActivePlanCategory('people')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                activePlanCategory === 'people'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📱 Rastreo Celular & Personal SOS
            </button>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {currentPlans.map((plan, idx) => (
              <div
                key={idx}
                className={`bg-slate-900/90 border rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 ${
                  plan.highlight
                    ? 'border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{plan.icon}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${plan.badgeColor}`}
                    >
                      {plan.tag}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-white">{plan.name}</h3>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-black text-cyan-400">{plan.price}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-1.5">
                        <span className="text-cyan-400 font-bold text-xs mt-0.5">✓</span>
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `Hola, me interesa contratar el ${plan.name} de EINSoft GPS.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white font-bold rounded-xl text-center text-xs transition border border-slate-700 block"
                >
                  💬 Solicitar Plan
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Column: Login Portal Card ── */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="space-y-1.5 border-b border-slate-800 pb-4">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
                Acceso a la Plataforma
              </span>
              <h2 className="text-2xl font-black text-white">Ingreso a la Central</h2>
              <p className="text-xs text-slate-400">
                Ingresa con tu cuenta de administrador, operador o cliente.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/50 text-rose-300 rounded-2xl text-xs font-bold animate-in fade-in flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-800 bg-slate-950 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none placeholder-slate-600 transition"
                  placeholder="admin@einsoftgps.com"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-800 bg-slate-950 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none placeholder-slate-600 transition"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-lg shadow-cyan-500/25 active:scale-98 disabled:opacity-50 mt-2"
              >
                {loading ? 'Verificando credenciales...' : '🚀 Iniciar Sesión'}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Servidor en línea</span>
              </span>
              <a
                href="/download-app"
                className="text-cyan-400 hover:text-cyan-300 font-bold underline"
              >
                Portal de Descargas →
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-500 font-mono">
        © {new Date().getFullYear()} EINSoft GPS • Sistema de Gestión de Flotas y Nodos Móviles EYE-NODE 360
      </footer>
    </div>
  )
}
