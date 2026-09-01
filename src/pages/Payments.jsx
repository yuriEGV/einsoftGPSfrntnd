import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient, safeStorage } from '../services/api'

const STATUS_CONFIG = {
  approved: { label: 'Aprobado', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-400' },
  pending: { label: 'Pendiente', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', dot: 'bg-amber-400' },
  rejected: { label: 'Rechazado', bg: 'bg-red-500/20 text-red-300 border-red-500/40', dot: 'bg-red-400' },
  cancelled: { label: 'Cancelado', bg: 'bg-slate-500/20 text-slate-300 border-slate-500/40', dot: 'bg-slate-400' },
  refunded: { label: 'Reembolsado', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40', dot: 'bg-blue-400' },
  charged_back: { label: 'Contracargo', bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40', dot: 'bg-orange-400' },
}

const SUB_STATUS_CONFIG = {
  active: { label: 'SERVICIO ACTIVO', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' },
  expired: { label: 'VENCIDO', cls: 'bg-red-500/20 text-red-300 border-red-500/50' },
  trial: { label: 'PERIODO DE PRUEBA', cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' },
  suspended: { label: 'SUSPENDIDO', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/50' },
  cancelled: { label: 'CANCELADO', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/50' },
  none: { label: 'SIN SUSCRIPCION', cls: 'bg-slate-800 text-slate-400 border-slate-700' },
}

function fmtCLP(amount) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)
}

function fmtDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function Payments() {
  const queryClient = useQueryClient()
  const user = JSON.parse(safeStorage.get('user') || '{}')
  const isAdmin = ['superadmin', 'admin', 'fleet_manager'].includes(user.role)
  const isSuperadmin = user.role === 'superadmin'

  const [activeCategory, setActiveCategory] = useState('vehicles')
  const [paymentTarget, setPaymentTarget] = useState('user')
  const [editingPayment, setEditingPayment] = useState(null)
  const [newStatus, setNewStatus] = useState('approved')
  const [filterAll, setFilterAll] = useState(false)

  const hasCompany = !!user.company

  const { data: plansData, isLoading: plansLoading } = useQuery('plans', async () => {
    const res = await apiClient.get('/payments/plans')
    return res.data.plans || []
  }, { staleTime: 1000 * 60 * 5 })

  const currentCustomerId = paymentTarget === 'company' && user.company ? user.company : user.id
  const currentCustomerModel = paymentTarget === 'company' && user.company ? 'Company' : 'User'

  const { data: subData } = useQuery(
    ['subscription', currentCustomerId, currentCustomerModel],
    async () => {
      const res = await apiClient.get('/payments/subscription/' + currentCustomerId + '?model=' + currentCustomerModel)
      return res.data
    },
    { enabled: !!currentCustomerId, staleTime: 1000 * 30 }
  )

  const { data: historyData, isLoading: historyLoading } = useQuery(
    ['payment-history', user.id, filterAll],
    async () => {
      const url = filterAll && isSuperadmin
        ? '/payments/history/' + user.id + '?all=true'
        : '/payments/history/' + user.id
      const res = await apiClient.get(url)
      return res.data
    },
    { enabled: !!user.id, staleTime: 1000 * 15 }
  )

  const createPaymentMutation = useMutation(
    async ({ planCode, customerId, customerModel }) => {
      const res = await apiClient.post('/payments/create', { planCode, customerId, customerModel })
      return res.data
    },
    {
      onSuccess: (data) => {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
        }
      },
      onError: (err) => {
        alert('Error al iniciar el pago: ' + (err.response?.data?.error || err.message))
      },
    }
  )

  const retryMutation = useMutation(
    async (paymentId) => {
      const res = await apiClient.post('/payments/' + paymentId + '/retry')
      return res.data
    },
    {
      onSuccess: (data) => {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
        }
      },
      onError: (err) => {
        alert('Error al retomar el pago: ' + (err.response?.data?.error || err.message))
      },
    }
  )

  const updateStatusMutation = useMutation(
    async ({ paymentId, status }) => {
      const res = await apiClient.patch('/payments/' + paymentId + '/status', { status })
      return res.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('payment-history')
        queryClient.invalidateQueries('subscription')
        setEditingPayment(null)
        alert('Estado de pago actualizado exitosamente y sincronizado con el GPS.')
      },
      onError: (err) => {
        alert('Error al actualizar estado: ' + (err.response?.data?.error || err.message))
      },
    }
  )

  const deletePaymentMutation = useMutation(
    async (paymentId) => {
      const res = await apiClient.delete('/payments/' + paymentId)
      return res.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('payment-history')
      },
      onError: (err) => {
        alert('Error al eliminar pago: ' + (err.response?.data?.error || err.message))
      },
    }
  )

  const handleSubscribe = (plan) => {
    const customerId = paymentTarget === 'company' && user.company ? user.company : user.id
    const customerModel = paymentTarget === 'company' && user.company ? 'Company' : 'User'
    createPaymentMutation.mutate({ planCode: plan.code, customerId, customerModel })
  }

  const allPlans = plansData || []
  const filteredPlans = allPlans.filter(p => p.category === activeCategory)
  const history = historyData?.payments || []
  const activeSub = subData

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">💳</span>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Suscripciones & Pagos GPS
            </h1>
            <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Mercado Pago
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Plataforma centralizada de facturación satelital en tiempo real en pesos chilenos (CLP).
          </p>
        </div>

        {hasCompany && (
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 shadow-xl">
            <button
              onClick={() => setPaymentTarget('user')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                paymentTarget === 'user'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>👤</span>
              <span>Cuenta Personal</span>
            </button>
            <button
              onClick={() => setPaymentTarget('company')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                paymentTarget === 'company'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🏢</span>
              <span>Cuenta Empresa</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Subscription Status Card */}
      {activeSub && (
        <div className={`relative overflow-hidden rounded-3xl border-2 p-6 transition-all shadow-2xl ${
          activeSub.active
            ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/40 shadow-emerald-950/30'
            : 'bg-slate-900/60 border-slate-800'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border ${
                activeSub.active
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {activeSub.active ? '🛰️' : '⏸️'}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Suscripción {paymentTarget === 'company' ? 'Empresarial' : 'Particular'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${SUB_STATUS_CONFIG[activeSub.status || 'none']?.cls}`}>
                    {SUB_STATUS_CONFIG[activeSub.status || 'none']?.label}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  {activeSub.hasSubscription ? (activeSub.plan?.name || activeSub.planCode || 'Plan GPS Activo') : 'Sin suscripción contratada'}
                </h2>
                {activeSub.hasSubscription && (
                  <p className="text-xs text-slate-400 mt-1">
                    Capacidad: <strong className="text-white">{activeSub.maxDevices} dispositivo(s)</strong> •{' '}
                    {activeSub.active
                      ? <span>Vigencia hasta el <strong className="text-emerald-400">{fmtDate(activeSub.expiresAt)}</strong></span>
                      : <span>Venció el <strong className="text-red-400">{fmtDate(activeSub.expiresAt)}</strong></span>}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
              {activeSub.active ? (
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400 tracking-tight">
                    {activeSub.daysLeft} días
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">restantes de servicio</span>
                </div>
              ) : (
                <div className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl">
                  ⚠️ Suscripción inactiva. Selecciona un plan abajo para activar.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Tab Switcher (Vehicular vs Personal SOS) */}
      <div className="flex justify-center">
        <div className="inline-flex bg-slate-900 border border-slate-800 rounded-2xl p-1.5 shadow-2xl">
          <button
            onClick={() => setActiveCategory('vehicles')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-black transition-all ${
              activeCategory === 'vehicles'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-lg">🚚</span>
            <span>Rastreo Vehicular & Flotas</span>
          </button>
          <button
            onClick={() => setActiveCategory('people')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-black transition-all ${
              activeCategory === 'people'
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-lg">📱</span>
            <span>Rastreo Celular & Personal SOS</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div>
        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-96 bg-slate-900/60 rounded-3xl border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
            <span className="text-4xl">📡</span>
            <p className="font-bold mt-2">Cargando planes en tiempo real...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredPlans.map((plan) => {
              const isCurrent = activeSub?.planCode === plan.code && activeSub?.active

              return (
                <div
                  key={plan.code}
                  className={`relative flex flex-col justify-between rounded-3xl border-2 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden backdrop-blur-xl ${
                    plan.highlight
                      ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-cyan-500/60 shadow-2xl shadow-cyan-950/40'
                      : isCurrent
                      ? 'bg-slate-900/90 border-emerald-500/60 shadow-xl shadow-emerald-950/30'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 shadow-xl'
                  }`}
                >
                  <div className="p-6 pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl">{plan.icon || '📡'}</div>
                      <div className="flex items-center gap-2">
                        {plan.tag && (
                          <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                            plan.highlight
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          }`}>
                            {plan.tag}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            ✓ ACTIVO
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-white tracking-tight leading-tight">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {plan.description}
                    </p>

                    <div className="mt-5 pt-4 border-t border-slate-800">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl md:text-4xl font-black text-white tracking-tight">
                          {fmtCLP(plan.price)}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                          {plan.period || 'CLP / mes'}
                        </span>
                      </div>
                      <div className="text-[11px] text-cyan-400 font-bold mt-1">
                        📡 Hasta {plan.maxDevices} dispositivo{plan.maxDevices > 1 ? 's' : ''} incluido{plan.maxDevices > 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="mt-6 space-y-2.5">
                      {(plan.features || []).map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                          <span className="text-cyan-400 font-bold mt-0.5">✓</span>
                          <span className="leading-snug">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 pt-4 border-t border-slate-800/60 bg-slate-950/40">
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={createPaymentMutation.isLoading}
                      className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl ${
                        plan.highlight
                          ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25 active:scale-95'
                          : isCurrent
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 active:scale-95'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-95'
                      } disabled:opacity-50`}
                    >
                      {createPaymentMutation.isLoading ? (
                        <span>⏳ Conectando con Mercado Pago...</span>
                      ) : isCurrent ? (
                        <span>🔄 Renovar Plan</span>
                      ) : (
                        <span>💳 Suscribirse</span>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Security Footer Badge */}
      <div className="flex items-center justify-center pt-4">
        <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl px-6 py-4 shadow-xl">
          <div className="text-2xl">🔒</div>
          <div>
            <div className="text-xs font-black text-white">
              Pagos 100% Seguros Procesados por Mercado Pago
            </div>
            <div className="text-[11px] text-slate-400">
              Acepta Tarjeta de Crédito, Débito Redcompra, Transferencia Bancaria y Efectivo.
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Pagos Interactivo */}
      <div className="pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>🧾</span>
              <span>Historial de Pagos & Transacciones</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Revisa el estado de tus transacciones, retoma pagos pendientes o gestiona registros.
            </p>
          </div>

          {isSuperadmin && (
            <button
              onClick={() => setFilterAll(!filterAll)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                filterAll
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {filterAll ? '👁️ Viendo Todos los Pagos del Sistema' : '👤 Ver Solo Mis Pagos'}
            </button>
          )}
        </div>

        <div className="bg-slate-900/80 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
          {historyLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Cargando historial de transacciones...
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-center">
              <span className="text-5xl mb-3">🧾</span>
              <p className="font-bold text-sm text-slate-400">Aún no hay transacciones registradas</p>
              <p className="text-xs mt-1 text-slate-500">Tus pagos aparecerán aquí automáticamente al suscribirte a un plan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4">Plan Contratado</th>
                    <th className="px-5 py-4">Monto (CLP)</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4">ID Mercado Pago</th>
                    <th className="px-5 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {history.map((p) => {
                    const st = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending
                    const isPending = p.status === 'pending'

                    return (
                      <tr key={p._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 text-slate-400 font-mono">
                          {fmtDate(p.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-black text-white">
                            {p.metadata?.planName || p.metadata?.planCode || 'Plan GPS'}
                          </div>
                          <div className="text-[10px] text-cyan-400 font-mono">
                            {p.metadata?.planCode}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-black text-white text-sm">
                          {fmtCLP(p.amount)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-[11px] border ${st.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            <span>{st.label}</span>
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                          {p.mpPaymentId || p.preferenceId?.substring(0, 16) || '—'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <button
                                onClick={() => retryMutation.mutate(p._id)}
                                disabled={retryMutation.isLoading}
                                className="px-3 py-1.5 rounded-xl font-black text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1"
                                title="Abrir checkout de Mercado Pago para completar el pago"
                              >
                                <span>💳</span>
                                <span>Pagar Ahora</span>
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setEditingPayment(p)
                                  setNewStatus(p.status)
                                }}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                                title="Modificar estado manualmente"
                              >
                                ⚙️ Editar
                              </button>
                            )}

                            {(isPending || isSuperadmin) && (
                              <button
                                onClick={() => {
                                  if (window.confirm('¿Deseas eliminar este registro de pago del historial?')) {
                                    deletePaymentMutation.mutate(p._id)
                                  }
                                }}
                                className="px-2 py-1.5 rounded-xl text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Eliminar registro"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Modificar Estado (Admin / Superadmin) */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>⚙️</span>
                <span>Modificar Estado de Pago</span>
              </h3>
              <button
                onClick={() => setEditingPayment(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">ID Pago:</span>
                  <span className="font-mono text-white">{editingPayment._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Plan:</span>
                  <span className="font-bold text-white">{editingPayment.metadata?.planName || editingPayment.metadata?.planCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Monto:</span>
                  <span className="font-black text-emerald-400">{fmtCLP(editingPayment.amount)}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-2">Nuevo Estado de Pago:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="approved">✅ Aprobado (Activa el Servicio GPS)</option>
                  <option value="pending">⏳ Pendiente</option>
                  <option value="rejected">❌ Rechazado</option>
                  <option value="cancelled">🛑 Cancelado</option>
                  <option value="refunded">↩️ Reembolsado</option>
                </select>
                {newStatus === 'approved' && (
                  <p className="text-[11px] text-emerald-400 font-bold mt-2 bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl">
                    ℹ️ Al marcar como "Aprobado", el servicio GPS y la suscripción de la empresa/usuario se activarán automáticamente por 30 días.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingPayment(null)}
                className="flex-1 py-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  updateStatusMutation.mutate({
                    paymentId: editingPayment._id,
                    status: newStatus,
                  })
                }}
                disabled={updateStatusMutation.isLoading}
                className="flex-1 py-3 rounded-xl font-black text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50"
              >
                {updateStatusMutation.isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
