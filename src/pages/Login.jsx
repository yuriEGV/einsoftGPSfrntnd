import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient, safeStorage } from '../services/api'

// Commercial Pricing Plans - Sober Security Palette
const VEHICLE_PLANS = [
  {
    name: 'Plan Particular / Familiar',
    icon: '🚗',
    price: '$9.990',
    period: 'CLP / mes',
    tag: 'Familiar',
    badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    features: [
      '1 vehículo principal incluido',
      'Rastreo satelital continuo en tiempo real',
      'Historial de rutas (30 días)',
      'Alertas de encendido y velocidad',
      'App móvil PWA para toda la familia',
      '+25% por vehículo adicional ($12.488)',
    ],
    highlight: false,
  },
  {
    name: 'Plan Pyme / Flotas Pro',
    icon: '🏢',
    price: '$19.990',
    period: 'CLP / mes por móvil',
    tag: 'Flotas Corporativas',
    badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800/60',
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
    icon: '🛡️',
    price: '$34.990',
    period: 'CLP / mes por móvil',
    tag: 'Seguridad Integral',
    badgeColor: 'bg-slate-800 text-slate-200 border-slate-700',
    features: [
      'Todo lo del Plan Pyme Flotas',
      'Telemetría avanzada IMU & Fuerza G',
      'Detección automática de colisiones',
      'Modo Centinela anti-sabotaje activo',
      'Caja Negra offline de alta redundancia',
      'Soporte técnico y auditoría prioritaria',
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
    badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    features: [
      '1 celular smartphone monitoreado',
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
    tag: 'Location Safety',
    badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800/60',
    features: [
      'Hasta 3 familiares / teléfonos incluidos',
      'Botón de Pánico SOS con mapa satelital',
      'Alertas directas a Telegram familiar',
      'Historial de desplazamientos 30 días',
      'Sin contratos de permanencia forzosa',
    ],
    highlight: true,
  },
  {
    name: 'Seguridad & Cuadrillas',
    icon: '🛡️',
    price: '$24.990',
    period: 'CLP / mes (hasta 10 personas)',
    tag: 'Guardias & Terreno',
    badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    features: [
      'Hasta 10 trabajadores de campo / guardias',
      'Panel centralizado de emergencias SOS',
      'Mapa táctico con actualización continua',
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
      setError(err.response?.data?.error || 'Credenciales inválidas. Verifique sus datos de acceso.')
    } finally {
      setLoading(false)
    }
  }

  // 1-Click Demo Login Handler for testing each role
  const handleDemoLogin = async (demoEmail) => {
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.post('/auth/login', {
        email: demoEmail,
        password: 'password123',
      })

      safeStorage.set('token', response.data.token)
      safeStorage.set('refreshToken', response.data.refreshToken)
      safeStorage.set('user', JSON.stringify(response.data.user))

      onLogin()
      const role = response.data.user.role
      if (role === 'driver') {
        navigate('/driver')
      } else if (role === 'mobile_gps_user' || role === 'independent') {
        navigate('/mobile-gps')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión en modo demo.')
    } finally {
      setLoading(false)
    }
  }

  const currentPlans = activePlanCategory === 'vehicles' ? VEHICLE_PLANS : PERSONAL_PLANS

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-200 font-sans flex flex-col justify-between selection:bg-slate-700 selection:text-white">
      {/* ── Top Navigation Header ── */}
      <header className="bg-[#0a0f1d] border-b border-slate-800/80 px-6 py-3.5 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-black text-sm shadow-inner">
            🛡️
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white uppercase font-mono">
              EINSOFT <span className="text-cyan-400">GPS</span>
            </h1>
            <p className="text-[10px] font-mono text-slate-400">
              Plataforma Corporativa de Seguridad Telemática & Nodos Móviles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/download-app"
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition shadow"
          >
            <span>📱</span> Descargar APK v2.3.0
          </a>
          <a
            href="https://t.me/EinGpsBot"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-cyan-400 hover:text-cyan-300 text-xs font-semibold rounded-xl items-center gap-1.5 transition"
          >
            <span>🤖</span> Bot @EinGpsBot
          </a>
        </div>
      </header>

      {/* ── Main Hero & Dual Login / Pricing Section ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Left Column: Overview & Plans ── */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-full font-mono uppercase tracking-wider">
                ● Telematics SOC Enterprise
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-snug">
                Monitoreo Satelital de Alta Fidelidad & Seguridad Preventiva
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
                Plataforma sobria de control perimetral, corte remoto de combustible, enlace directo con centrales de respuesta 24/7 y telemetría inercial para flotas corporativas y protección familiar.
              </p>
            </div>

            {/* Plan Category Switcher */}
            <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
              <button
                onClick={() => setActivePlanCategory('vehicles')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  activePlanCategory === 'vehicles'
                    ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🚗</span> Rastreo Vehicular & Flotas
              </button>
              <button
                onClick={() => setActivePlanCategory('people')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  activePlanCategory === 'people'
                    ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>📱</span> Rastreo Celular & Personal SOS
              </button>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {currentPlans.map((plan, idx) => (
                <div
                  key={idx}
                  className={`bg-[#0a0f1d] border rounded-2xl p-4 flex flex-col justify-between transition-all duration-150 ${
                    plan.highlight
                      ? 'border-cyan-500/50 shadow-md ring-1 ring-cyan-500/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{plan.icon}</span>
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${plan.badgeColor}`}
                      >
                        {plan.tag}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-white">{plan.name}</h3>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-lg font-black text-cyan-400 font-mono">{plan.price}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{plan.period}</span>
                      </div>
                    </div>

                    <ul className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-1.5">
                          <span className="text-cyan-400 font-bold text-xs">✓</span>
                          <span className="leading-snug text-slate-300">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Hola, deseo contratar el ${plan.name} de EINSoft GPS.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold rounded-xl text-center text-xs transition border border-slate-800 block"
                  >
                    Solicitar Plan
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right Column: Login Portal Card ── */}
          <div className="lg:col-span-5">
            <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
              <div className="space-y-1 border-b border-slate-800/80 pb-3.5">
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-widest block">
                  Autenticación de Seguridad
                </span>
                <h2 className="text-xl font-black text-white">Ingreso a la Central</h2>
                <p className="text-xs text-slate-400">
                  Acceso para administradores, operadores SOC y clientes corporativos.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none placeholder-slate-600 transition"
                    placeholder="admin@einsoftgps.com"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none placeholder-slate-600 transition"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 disabled:opacity-50 mt-1 flex items-center justify-center gap-2"
                >
                  <span>🔒</span>
                  <span>{loading ? 'Verificando credenciales...' : 'Iniciar Sesión Segura'}</span>
                </button>
              </form>

              {/* ── 1-Click Demo Escalafones Selector ── */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>⚡</span> Modo Demo / Prueba Rápida
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">1-Clic sin escribir</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('cliente@einsoftgps.com')}
                    disabled={loading}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-left transition flex items-center gap-2 font-medium"
                  >
                    <span>👤</span>
                    <div>
                      <div className="font-bold text-white text-[11px]">Demo Cliente</div>
                      <div className="text-[9px] text-slate-400">Consulta y rastreo</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoLogin('admin.flota@einsoftgps.com')}
                    disabled={loading}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-left transition flex items-center gap-2 font-medium"
                  >
                    <span>🏢</span>
                    <div>
                      <div className="font-bold text-white text-[11px]">Admin Flota</div>
                      <div className="text-[9px] text-slate-400">Gestión de vehículos</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoLogin('conductor@einsoftgps.com')}
                    disabled={loading}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-left transition flex items-center gap-2 font-medium"
                  >
                    <span>🚗</span>
                    <div>
                      <div className="font-bold text-amber-300 text-[11px]">Conductor</div>
                      <div className="text-[9px] text-slate-400">Panel /driver</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoLogin('celular@einsoftgps.com')}
                    disabled={loading}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-left transition flex items-center gap-2 font-medium"
                  >
                    <span>📱</span>
                    <div>
                      <div className="font-bold text-emerald-300 text-[11px]">Celular GPS</div>
                      <div className="text-[9px] text-slate-400">Panel /mobile-gps</div>
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('operador@einsoftgps.com')}
                  disabled={loading}
                  className="w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-cyan-900/60 hover:border-cyan-700 text-cyan-300 text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <span>📡</span> Ingresar como Operador Monitoreo SOC 24/7
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-slate-400">Servidores Operativos 24/7</span>
                </span>
                <a
                  href="/download-app"
                  className="text-cyan-400 hover:text-cyan-300 font-semibold transition"
                >
                  Descargas Oficiales →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Usos y Operaciones Principales en el Portal de Acceso ─── */}
        <div className="pt-6 border-t border-slate-800/80 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase block mb-0.5">
                Capacidades Operativas
              </span>
              <h3 className="text-base font-black text-white">Usos y Operaciones Principales</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#0a0f1d] border border-slate-800 space-y-1.5">
              <span className="text-xs font-bold text-cyan-400 font-mono uppercase block">
                🧭 Location Safety
              </span>
              <h4 className="text-xs font-bold text-white">Coordinación y Ubicación Familiar</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Permite visualizar la localización exacta de personas en el mapa para facilitar la organización cotidiana y monitorear trayectos en tiempo real.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0a0f1d] border border-slate-800 space-y-1.5">
              <span className="text-xs font-bold text-amber-400 font-mono uppercase block">
                🛡️ Driving Safety
              </span>
              <h4 className="text-xs font-bold text-white">Seguridad en la Conducción</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ofrece soporte constante con monitoreo telemático de conducción e identificación inmediata de desaceleraciones bruscas y colisiones en ruta.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0a0f1d] border border-slate-800 space-y-1.5">
              <span className="text-xs font-bold text-emerald-400 font-mono uppercase block">
                🏷️ Asset & Pet Tracking
              </span>
              <h4 className="text-xs font-bold text-white">Localización de Objetos y Mascotas</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Permite enlazar y visualizar dispositivos de rastreo Tile directamente en el mapa de la app para recuperar objetos de valor (como llaves) o rastrear mascotas.
              </p>
            </div>
          </div>

          {/* Casos de uso destacados */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <strong className="text-slate-200 block text-xs">👨‍👩‍👧 Padres con Hijos Adolescentes</strong>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Aporta tranquilidad supervisando la conducción, salidas de geocercas escolares y la llegada oportuna a destino.
              </p>
            </div>
            <div className="space-y-1">
              <strong className="text-slate-200 block text-xs">👵 Autonomía para Adultos Mayores</strong>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Otorga autonomía con supervisión preventiva a adultos mayores que aún conducen, con botón SOS y atención médica.
              </p>
            </div>
            <div className="space-y-1">
              <strong className="text-slate-200 block text-xs">🤝 Parejas y Amigos</strong>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Facilita la localización recíproca entre parejas o amigos para coordinar viajes y desplazamientos seguros.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#050811] border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-500 font-mono">
        © {new Date().getFullYear()} EINSoft GPS • Centro de Seguridad Telemática & Nodos Móviles EYE-NODE 360
      </footer>
    </div>
  )
}
