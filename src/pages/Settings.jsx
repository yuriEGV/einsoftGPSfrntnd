import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

// Pricing Plan Configuration
const PLANS = [
  {
    key: 'basic',
    name: 'Plan Empresa Básico',
    icon: '🏢',
    color: 'from-blue-600 to-blue-700',
    badge: 'Corporativo',
    basePrice: 19990,
    currency: 'CLP',
    period: 'mes/vehículo',
    features: [
      '✅ Rastreo GPS en tiempo real',
      '✅ Historial de rutas (30 días)',
      '✅ Alertas de velocidad y geofencing',
      '✅ Panel de gestión de flota',
      '✅ Reportes básicos',
      '✅ Soporte por email',
    ],
    note: null,
  },
  {
    key: 'pro',
    name: 'Plan Empresa Pro',
    icon: '🚀',
    color: 'from-indigo-600 to-purple-700',
    badge: 'Más Popular',
    basePrice: 34990,
    currency: 'CLP',
    period: 'mes/vehículo',
    features: [
      '✅ Todo lo del Plan Básico',
      '✅ Historial de rutas (90 días)',
      '✅ Control remoto del motor',
      '✅ Escucha espía de cabina',
      '✅ Sensor de combustible',
      '✅ Reportes avanzados + exportación Excel',
      '✅ Soporte prioritario 24/7',
    ],
    note: null,
  },
  {
    key: 'independent',
    name: 'Plan Particular / Familiar',
    icon: '👨‍👩‍👧',
    color: 'from-emerald-600 to-teal-700',
    badge: 'Plan Familiar',
    basePrice: 9990,
    currency: 'CLP',
    period: 'mes (vehículo principal)',
    features: [
      '✅ 1 vehículo principal incluido',
      '✅ Rastreo GPS en tiempo real',
      '✅ Historial de rutas (14 días)',
      '✅ Alertas de velocidad',
      '✅ App móvil para seguimiento',
    ],
    note: 'Por cada vehículo familiar adicional, se aplica un recargo del 25% sobre la tarifa base mensual.',
    familyExtra: 0.25, // 25% surcharge per extra vehicle
    extraPrice: 12488, // 9990 * 1.25 = ~12,488 CLP/mes
  },
]

// Pricing Plans for Personal & Phone Tracking Service
const PERSON_PLANS = [
  {
    key: 'person_individual',
    name: 'Plan Personal Individual',
    icon: '👤',
    color: 'from-purple-600 to-indigo-700',
    badge: '1 Persona',
    basePrice: 4990,
    currency: 'CLP',
    period: 'mes/persona',
    features: [
      '✅ 1 Celular / Familiar rastreado',
      '✅ Geolocalización GPS en tiempo real',
      '✅ Botón de Pánico SOS Instantáneo',
      '✅ Monitoreo de porcentaje de Batería',
      '✅ Alertas de velocidad y precisión GPS',
      '✅ Historial de ruta (14 días)',
    ],
    note: null,
  },
  {
    key: 'person_family',
    name: 'Plan Protección Familiar SOS',
    icon: '👨‍👩‍👧‍👦',
    color: 'from-purple-700 to-pink-700',
    badge: '3 Personas',
    basePrice: 9990,
    currency: 'CLP',
    period: 'mes (hasta 3 personas)',
    features: [
      '✅ Hasta 3 familiares / celulares incluidos',
      '✅ Geolocalización GPS en tiempo real',
      '✅ Botón de Pánico SOS Instantáneo',
      '✅ Sirena auditiva SOS y síntesis de voz',
      '✅ Enlace público directo para WhatsApp',
      '✅ Monitoreo de batería y precisión GPS',
      '✅ Historial de ruta (30 días)',
    ],
    note: 'Ideal para grupos familiares, niños y adultos mayores.',
  },
  {
    key: 'person_enterprise',
    name: 'Plan Personal de Campo / Seguridad',
    icon: '🛡️',
    color: 'from-slate-800 to-indigo-900',
    badge: 'Empresas / Hasta 10 Personas',
    basePrice: 24990,
    currency: 'CLP',
    period: 'mes (hasta 10 personas)',
    features: [
      '✅ Hasta 10 guardias / trabajadores de campo',
      '✅ Panel centralizado de emergencias SOS',
      '✅ Mapa en tiempo real con actualización cada 4s',
      '✅ Alertas SOS auditivas y por correo',
      '✅ Reportes de ubicación y asistencia',
      '✅ Soporte técnico prioritario 24/7',
    ],
    note: null,
  },
]

function PlanCard({ plan, vehicleCount = 1 }) {
  const extraVehicles = Math.max(0, vehicleCount - 1)
  const totalPrice = plan.key === 'independent'
    ? plan.basePrice + extraVehicles * plan.extraPrice
    : plan.basePrice * vehicleCount

  return (
    <div className={`relative bg-gradient-to-br ${plan.color} text-white rounded-2xl p-6 shadow-xl overflow-hidden`}>
      {/* Badge */}
      <div className="absolute top-4 right-4">
        <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/30">
          {plan.badge}
        </span>
      </div>

      <div className="text-3xl mb-3">{plan.icon}</div>
      <h3 className="text-xl font-black text-white mb-1">{plan.name}</h3>
      <div className="mb-4">
        <span className="text-3xl font-black">${plan.basePrice.toLocaleString('es-CL')}</span>
        <span className="text-white/70 text-sm ml-1">CLP/{plan.period}</span>
      </div>

      {plan.key === 'independent' && (
        <div className="bg-white/10 border border-white/20 rounded-xl p-3 mb-4 text-xs">
          <p className="font-bold text-yellow-200 mb-1">📋 Estructura de precios:</p>
          <p>• Vehículo principal: <strong>${plan.basePrice.toLocaleString('es-CL')}/mes</strong></p>
          <p>• Vehículo familiar adicional: <strong>${plan.extraPrice.toLocaleString('es-CL')}/mes</strong></p>
          <p className="text-white/60 text-[10px] mt-1">(Base + 25% de recargo por cada vehículo extra)</p>
        </div>
      )}

      <ul className="space-y-1.5 text-sm text-white/90 mb-4">
        {plan.features.map(f => <li key={f}>{f}</li>)}
      </ul>

      {plan.note && (
        <div className="bg-yellow-400/20 border border-yellow-300/30 rounded-lg p-3 text-xs text-yellow-100 mb-2">
          ⚠️ {plan.note}
        </div>
      )}

      {/* Background decorative circle */}
      <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/5 blur-xl" />
    </div>
  )
}

function FamilyPricingCalculator() {
  const [extraVehicles, setExtraVehicles] = useState(0)
  const BASE = 9990
  const EXTRA_RATE = 1.25
  const extraPrice = Math.round(BASE * EXTRA_RATE)
  const total = BASE + extraVehicles * extraPrice

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
      <h3 className="font-bold text-emerald-800 text-lg mb-1">🧮 Calculadora Plan Familiar</h3>
      <p className="text-emerald-700 text-sm mb-4">
        Descubre cuánto pagarás según el número de vehículos familiares adicionales.
      </p>
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <label className="text-sm font-semibold text-gray-700 w-48">Vehículos adicionales:</label>
          <input
            type="range"
            min={0}
            max={9}
            value={extraVehicles}
            onChange={e => setExtraVehicles(Number(e.target.value))}
            className="flex-1 h-2 accent-emerald-600"
          />
          <span className="w-8 text-center font-black text-emerald-700 text-lg">{extraVehicles}</span>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Vehículo principal (1)</span>
            <span className="font-bold">${BASE.toLocaleString('es-CL')}/mes</span>
          </div>
          {extraVehicles > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>{extraVehicles} vehículo{extraVehicles > 1 ? 's' : ''} adicional{extraVehicles > 1 ? 'es' : ''} (×${extraPrice.toLocaleString('es-CL')})</span>
              <span className="font-bold text-orange-600">+${(extraVehicles * extraPrice).toLocaleString('es-CL')}/mes</span>
            </div>
          )}
          <div className="flex justify-between text-gray-800 border-t pt-2 font-black text-base">
            <span>Total mensual ({1 + extraVehicles} vehículo{1 + extraVehicles > 1 ? 's' : ''})</span>
            <span className="text-emerald-700">${total.toLocaleString('es-CL')}/mes</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  const queryClient = useQueryClient()
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [vehicleForm, setVehicleForm] = useState({
    licensePlate: '',
    make: '',
    model: '',
    year: '',
    color: '',
    assignedDriver: '',
  })
  const [activeTab, setActiveTab] = useState('account') // 'account' | 'hardware' | 'plans'

  const { data: profile } = useQuery('profile', async () => {
    const response = await apiClient.get('/users/profile')
    return response.data
  }, {
    onSuccess: (data) => {
      setProfileForm({ name: data.name || '', phone: data.phone || '' })
    },
  })

  const { data: vehicles } = useQuery('vehicles', async () => {
    const response = await apiClient.get('/vehicles')
    return response.data
  })

  const { data: drivers = [] } = useQuery('drivers', async () => {
    const response = await apiClient.get('/users/drivers')
    return response.data
  })

  const updateProfileMutation = useMutation(
    (payload) => apiClient.put('/users/profile', payload),
    {
      onSuccess: () => {
        alert('Perfil actualizado correctamente')
        queryClient.invalidateQueries('profile')
      },
    },
  )

  const changePasswordMutation = useMutation(
    (payload) => apiClient.post('/users/change-password', payload),
    {
      onSuccess: () => {
        alert('Contraseña actualizada con éxito')
        setPasswordForm({ currentPassword: '', newPassword: '' })
      },
      onError: (err) => {
        alert('Error: ' + (err.response?.data?.error || 'No se pudo cambiar la contraseña'))
      }
    }
  )

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    updateProfileMutation.mutate(profileForm)
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    changePasswordMutation.mutate(passwordForm)
  }

  const tabs = [
    { key: 'account', label: '👤 Mi Cuenta', icon: '👤' },
    { key: 'telegram', label: '📱 Bot Telegram & Alertas SOS', icon: '📱' },
    { key: 'hardware', label: '🔧 Hardware GPS', icon: '🔧' },
    { key: 'plans', label: '💳 Planes y Precios', icon: '💳' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Configuración</h1>
        <p className="text-sm text-gray-500">v2.3.0 — Einsoft GPS</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ────── TAB: ACCOUNT ────── */}
      {activeTab === 'account' && (
        <div className="card">
          <h2 className="card-header">Configuración de Cuenta</h2>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-4 tracking-tight uppercase">Perfil de Usuario</h3>
              <form onSubmit={handleProfileSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-gray-700 mb-1 font-semibold">Nombre</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 font-semibold">Teléfono</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-900/10 transition-all disabled:opacity-50"
                >
                  {updateProfileMutation.isLoading ? 'Guardando...' : 'Guardar Perfil'}
                </button>
              </form>
            </div>

            {/* Change password */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-4 tracking-tight uppercase">Seguridad / Contraseña</h3>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-gray-700 mb-1 font-semibold">Contraseña Actual</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 font-semibold">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isLoading}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold shadow-lg shadow-slate-900/10 transition-all disabled:opacity-50"
                >
                  {changePasswordMutation.isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ────── TAB: TELEGRAM BOT ────── */}
      {activeTab === 'telegram' && (
        <div className="space-y-6">
          {/* Main Bot Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-indigo-500/30 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-56 h-56 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl shadow-xl shadow-blue-500/30">
                  📱
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white">Bot Oficial de Telegram EINSoft GPS</h2>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Activo & Conectado
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/80 mt-1 max-w-xl">
                    Recibe alertas de pánico SOS instantáneas, excesos de velocidad y consulta el estado de vehículos y personas directamente desde tu teléfono en Telegram.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="https://t.me/EinGpsBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-2xl text-xs shadow-xl shadow-blue-500/30 transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  🚀 Abrir Bot @EinGpsBot en Telegram
                </a>
              </div>
            </div>

            {/* Quick Steps Box */}
            <div className="mt-6 pt-6 border-t border-indigo-800/40 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-indigo-500/20">
                <p className="font-bold text-blue-300 mb-1">1️⃣ Inicia el Bot en Telegram</p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Abre Telegram en tu teléfono o PC, busca <strong>@EinGpsBot</strong> o haz click en el botón azul y presiona <strong>/start</strong>.
                </p>
              </div>
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-indigo-500/20">
                <p className="font-bold text-emerald-300 mb-1">2️⃣ Recibe Alertas Automáticas</p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Si un vehículo o persona presiona el botón de Pánico SOS o excede los 120 km/h, recibirás una notificación urgente con mapa.
                </p>
              </div>
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-indigo-500/20">
                <p className="font-bold text-purple-300 mb-1">3️⃣ Consulta con IA o Comandos</p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Usa comandos como <code>/vehiculos</code>, <code>/ubicacion</code> o escribe en texto libre para consultar a la IA inteligente.
                </p>
              </div>
            </div>
          </div>

          {/* Telegram Command Guide */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span>📖</span> Guía de Comandos Disponibles en Telegram
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <code className="text-blue-700 font-bold text-sm block mb-1">/start</code>
                <p className="text-slate-600">Bienvenida, verificación de rol y menú principal de la plataforma.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <code className="text-blue-700 font-bold text-sm block mb-1">/resumen</code>
                <p className="text-slate-600">Resumen ejecutivo instantáneo de vehículos activos, offline y alertas.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <code className="text-blue-700 font-bold text-sm block mb-1">/vehiculos</code>
                <p className="text-slate-600">Lista completa de vehículos monitoreados con su estado y dirección.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <code className="text-blue-700 font-bold text-sm block mb-1">/ubicacion PATENTE</code>
                <p className="text-slate-600">Ubica un vehículo específico en el mapa y entrega coordenadas exactas.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <code className="text-red-700 font-bold text-sm block mb-1">/panico</code>
                <p className="text-slate-600">Muestra emergencias SOS activas con botones interactivos para reconocer ✅ y resolver ✔️.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <code className="text-purple-700 font-bold text-sm block mb-1">/personas</code>
                <p className="text-slate-600">Lista de personal y familiares rastreados con su nivel de batería.</p>
              </div>
            </div>
          </div>

          {/* Panic Alert Recipients */}
          <BotUsersPanel />
        </div>
      )}

      {/* ────── TAB: HARDWARE ────── */}
      {activeTab === 'hardware' && (
        <div className="card overflow-hidden">
          <h2 className="card-header bg-emerald-600 text-white">Gestión de Hardware GPS y Correlación de Flota</h2>
          <div className="p-6">
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              Utilice esta tabla para <strong>vincular definitivamente</strong> sus vehículos a sus dispositivos físicos (IMEI) y asignar inmediatamente al conductor que operará la unidad.
              Este paso es crucial para habilitar el seguimiento en tiempo real y la gestión de alertas.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-black tracking-widest border-b text-center">
                  <tr>
                    <th className="px-4 py-3 text-left">Vehículo</th>
                    <th className="px-4 py-3">IMEI Dispositivo</th>
                    <th className="px-4 py-3">Chip / SIM</th>
                    <th className="px-4 py-3">Conductor</th>
                    <th className="px-4 py-3">Modelo</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vehicles?.map(v => (
                    <DeviceRow key={v._id} vehicle={v} drivers={drivers} />
                  ))}
                  {(!vehicles || vehicles.length === 0) && (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-gray-400 italic font-medium">
                        Actualmente no hay vehículos registrados en su flota para vincular.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────── TAB: PLANS ────── */}
      {activeTab === 'plans' && (
        <div className="space-y-10">
          {/* Section 1: Vehicular Tracking Plans */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b pb-3">
              <span className="text-2xl">🚗</span>
              <div>
                <h2 className="text-xl font-black text-slate-900">Planes de Rastreo Vehicular</h2>
                <p className="text-xs text-slate-500">Para automóviles, camiones, motocicletas y flotas corporativas.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PLANS.map(plan => (
                <PlanCard key={plan.key} plan={plan} vehicleCount={1} />
              ))}
            </div>

            <FamilyPricingCalculator />

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-sm">
              <h3 className="font-bold text-blue-800 text-base mb-3">📋 Condiciones del Plan Vehicular Familiar</h3>
              <ul className="space-y-2 text-blue-700">
                <li>• El <strong>Plan Particular / Familiar</strong> incluye 1 vehículo principal por <strong>$9.990 CLP/mes</strong>.</li>
                <li>• Cada vehículo familiar adicional (cónyuge, hijos, etc.) tiene un recargo del <strong>25%</strong> sobre la tarifa base.</li>
                <li>• Precio por vehículo adicional: <strong>$12.488 CLP/mes</strong> (=$9.990 × 1.25).</li>
                <li>• Para flotas corporativas, consulta los planes <strong>Empresa Básico</strong> o <strong>Empresa Pro</strong>.</li>
              </ul>
            </div>
          </div>

          {/* Section 2: Personal & Cellphone Tracking Plans */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3 border-b pb-3">
              <span className="text-2xl">📱</span>
              <div>
                <h2 className="text-xl font-black text-purple-950">Planes de Rastreo Personal y Celulares</h2>
                <p className="text-xs text-purple-700/80">Servicio independiente para familiares, adultos mayores, niños y personal de campo con Botón de Pánico SOS.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PERSON_PLANS.map(plan => (
                <PlanCard key={plan.key} plan={plan} vehicleCount={1} />
              ))}
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-sm">
              <h3 className="font-bold text-purple-900 text-base mb-3">🚨 Ventajas del Servicio de Rastreo Personal & SOS</h3>
              <ul className="space-y-2 text-purple-800">
                <li>• <strong>Servicio 100% Independiente</strong>: No interfiere con las cuotas ni la gestión de los vehículos.</li>
                <li>• <strong>Botón de Pánico Instantáneo</strong>: Funciona con un solo toque desde cualquier navegador smartphone.</li>
                <li>• <strong>Alertas Auditivas en Vivo</strong>: La consola central emite un tono de emergencia e indica la voz en tiempo real cuando se activa la alarma.</li>
                <li>• <strong>Monitoreo de Batería</strong>: Visualiza el nivel de batería restante de los smartphones de tus familiares o trabajadores.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── BotUsersPanel: Manage who receives Telegram panic alerts ─────────────────
function BotUsersPanel() {
  const queryClient = useQueryClient()
  const [newUser, setNewUser] = useState({ telegramId: '', telegramUsername: '', role: 'admin' })
  const [addStatus, setAddStatus] = useState(null)

  const { data: botUsers = [], isLoading } = useQuery('botUsers', async () => {
    const res = await apiClient.get('/bot/users')
    return res.data
  })

  const addMutation = useMutation(
    async (payload) => {
      const res = await apiClient.post('/bot/users', payload)
      return res.data
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('botUsers')
        setNewUser({ telegramId: '', telegramUsername: '', role: 'admin' })
        setAddStatus({ type: 'success', msg: `Usuario @${data.telegramUsername || data.telegramId} registrado. Se le ha enviado un mensaje de bienvenida en Telegram.` })
        setTimeout(() => setAddStatus(null), 5000)
      },
      onError: (err) => {
        setAddStatus({ type: 'error', msg: err.response?.data?.error || 'Error al registrar usuario' })
      }
    }
  )

  const removeMutation = useMutation(
    async (telegramId) => apiClient.delete(`/bot/users/${telegramId}`),
    {
      onSuccess: () => queryClient.invalidateQueries('botUsers'),
    }
  )

  const handleAdd = (e) => {
    e.preventDefault()
    if (!newUser.telegramId) return
    addMutation.mutate(newUser)
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-red-100">
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-xl">
          🚨
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900">Telefonos Configurados para Alertas SOS</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Estas cuentas de Telegram reciben alertas instantaneas cuando se activa un boton de Panico SOS en cualquier vehiculo o persona.
          </p>
        </div>
      </div>

      {/* How to get Telegram ID */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 text-xs">
        <p className="font-bold text-blue-800 mb-2">Como obtener tu Telegram ID:</p>
        <ol className="space-y-1 text-blue-700 list-decimal list-inside">
          <li>Abre Telegram y busca el bot <strong>@userinfobot</strong></li>
          <li>Escribe <code className="bg-blue-100 px-1 rounded">/start</code> y te dara tu ID numerico</li>
          <li>Copia ese numero y pega lo aqui abajo</li>
        </ol>
      </div>

      {/* Add new bot user */}
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Telegram ID (numerico)</label>
          <input
            type="text"
            value={newUser.telegramId}
            onChange={e => setNewUser({ ...newUser, telegramId: e.target.value })}
            placeholder="Ej: 123456789"
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Username (sin @)</label>
          <input
            type="text"
            value={newUser.telegramUsername}
            onChange={e => setNewUser({ ...newUser, telegramUsername: e.target.value })}
            placeholder="Ej: yuri_gv"
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Rol</label>
          <select
            value={newUser.role}
            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
          >
            <option value="admin">Admin (recibe todas las alertas)</option>
            <option value="operator">Operador (recibe alertas)</option>
            <option value="viewer">Observador (solo consultas)</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={addMutation.isLoading || !newUser.telegramId}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
          >
            {addMutation.isLoading ? '...' : '+ Agregar Alerta SOS'}
          </button>
        </div>
      </form>

      {addStatus && (
        <div className={`p-3 rounded-xl text-xs font-medium mb-4 ${addStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {addStatus.type === 'success' ? '✅' : '❌'} {addStatus.msg}
        </div>
      )}

      {/* Bot users list */}
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-slate-400 text-center py-4">Cargando...</p>
        ) : botUsers.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-2xl mb-2">📵</p>
            <p className="text-xs text-slate-500 font-medium">No hay telefonos configurados para alertas SOS.</p>
            <p className="text-xs text-slate-400 mt-1">Agrega un Telegram ID arriba para empezar a recibir notificaciones de Panico.</p>
          </div>
        ) : (
          botUsers.map(u => (
            <div key={u._id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${u.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                  {u.role === 'admin' ? '🛡️' : u.role === 'operator' ? '🔧' : '👁️'}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {u.telegramUsername ? `@${u.telegramUsername}` : `ID: ${u.telegramId}`}
                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${u.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.enabled ? 'Activo' : 'Desactivado'}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    ID: {u.telegramId} · Rol: {u.role} · Ultima actividad: {u.lastActivity ? new Date(u.lastActivity).toLocaleDateString('es-CL') : 'Nunca'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { if (confirm('Deshabilitar este usuario de alertas SOS?')) removeMutation.mutate(u.telegramId) }}
                disabled={removeMutation.isLoading}
                className="text-[10px] text-red-600 hover:text-red-800 font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Quitar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function DeviceRow({ vehicle, drivers = [] }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    deviceIMEI: vehicle.deviceIMEI || '',
    simCardNumber: vehicle.simCardNumber || '',
    deviceModel: vehicle.deviceModel || '',
    driverId: vehicle.driver?._id || vehicle.driver || ''
  })

  const linkMutation = useMutation(
    (payload) => apiClient.post(`/vehicles/${vehicle._id}/link-device`, payload),
    {
      onSuccess: () => {
        alert(`✅ Sincronización exitosa: El vehículo ${vehicle.licensePlate} ha sido vinculado al hardware indicado.`)
        queryClient.invalidateQueries('vehicles')
      },
      onError: (err) => {
        const msg = err.response?.data?.error || 'Falló la vinculación.'
        alert(`❌ Error al vincular: ${msg}`)
      }
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.deviceIMEI) return alert('El IMEI es obligatorio para poder vincular el hardware.')
    linkMutation.mutate(formData)
  }

  return (
    <tr className="hover:bg-blue-50/30 transition-colors">
      <td className="px-4 py-4">
        <div className="font-black text-blue-900 leading-tight">{vehicle.licensePlate}</div>
        <div className="text-[10px] text-gray-400 font-bold uppercase">{vehicle.make} {vehicle.model}</div>
      </td>
      <td className="px-4 py-4">
        <input
          type="text"
          value={formData.deviceIMEI}
          onChange={(e) => setFormData({ ...formData, deviceIMEI: e.target.value })}
          className="w-full border-2 border-slate-100 rounded-lg px-2 py-1.5 text-xs font-mono focus:border-blue-500 outline-none bg-white transition-all shadow-sm"
          placeholder="IMEI"
        />
      </td>
      <td className="px-4 py-4">
        <input
          type="text"
          value={formData.simCardNumber}
          onChange={(e) => setFormData({ ...formData, simCardNumber: e.target.value })}
          className="w-full border-2 border-slate-100 rounded-lg px-2 py-1.5 text-xs focus:border-blue-500 outline-none bg-white transition-all shadow-sm"
          placeholder="Chip #"
        />
      </td>
      <td className="px-4 py-4">
        <select
          value={formData.driverId}
          onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
          className="w-full border-2 border-slate-100 rounded-lg px-2 py-1.5 text-xs focus:border-blue-500 outline-none bg-white transition-all shadow-sm cursor-pointer"
        >
          <option value="">Seleccionar Conductor...</option>
          {drivers.map(d => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-4">
        <input
          type="text"
          value={formData.deviceModel}
          onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
          className="w-full border-2 border-slate-100 rounded-lg px-2 py-1.5 text-xs focus:border-blue-500 outline-none bg-white transition-all shadow-sm"
          placeholder="GT06 / Coban"
        />
      </td>
      <td className="px-4 py-4 text-right">
        <button
          onClick={handleSubmit}
          disabled={linkMutation.isLoading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10 disabled:bg-gray-300 transition-all hover:-translate-y-0.5"
        >
          {linkMutation.isLoading ? '...' : 'Vincular'}
        </button>
      </td>
    </tr>
  )
}
