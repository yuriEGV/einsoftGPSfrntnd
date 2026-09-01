import React, { useState } from 'react'
import { useQuery, useMutation } from 'react-query'
import { apiClient, safeStorage } from '../services/api'

const PLAN_ICONS = {
  'GPS-BASICO': '📍',
  'GPS-FAMILIAR': '👨‍👩‍👧‍👦',
  'GPS-EMPRESA': '🏢',
  'GPS-EMPRESA-PRO': '🚀',
}
const PLAN_GRADIENT = {
  'GPS-BASICO': 'from-blue-500 to-cyan-500',
  'GPS-FAMILIAR': 'from-emerald-500 to-teal-500',
  'GPS-EMPRESA': 'from-purple-600 to-violet-600',
  'GPS-EMPRESA-PRO': 'from-amber-500 to-orange-600',
}
const STATUS_LABELS = {
  approved: { label: 'Aprobado', cls: 'bg-green-100 text-green-700 border-green-300' },
  pending: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  rejected: { label: 'Rechazado', cls: 'bg-red-100 text-red-700 border-red-300' },
  cancelled: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-600 border-gray-300' },
  refunded: { label: 'Reembolsado', cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  charged_back: { label: 'Contracargo', cls: 'bg-orange-100 text-orange-700 border-orange-300' },
}
const SUB_STATUS = {
  active: { label: 'ACTIVO', cls: 'bg-green-100 text-green-700 border-green-300' },
  expired: { label: 'VENCIDO', cls: 'bg-red-100 text-red-700 border-red-300' },
  trial: { label: 'PRUEBA', cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  suspended: { label: 'SUSPENDIDO', cls: 'bg-orange-100 text-orange-700 border-orange-300' },
  cancelled: { label: 'CANCELADO', cls: 'bg-gray-100 text-gray-600 border-gray-300' },
  none: { label: 'Sin suscripcion', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

function fmtCLP(amount) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)
}
function fmtDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function Payments() {
  const user = JSON.parse(safeStorage.get('user') || '{}')
  const [paymentTarget, setPaymentTarget] = useState('user')
  const hasCompany = !!user.company

  const { data: plansData, isLoading: plansLoading } = useQuery('plans', async () => {
    const res = await apiClient.get('/payments/plans')
    return res.data.plans || []
  }, { staleTime: 1000 * 60 * 5 })

  const { data: subUser } = useQuery(['subscription', user.id, 'User'], async () => {
    const res = await apiClient.get('/payments/subscription/' + user.id + '?model=User')
    return res.data
  }, { enabled: !!user.id, staleTime: 1000 * 60 })

  const { data: subCompany } = useQuery(['subscription', user.company, 'Company'], async () => {
    const res = await apiClient.get('/payments/subscription/' + user.company + '?model=Company')
    return res.data
  }, { enabled: !!user.company, staleTime: 1000 * 60 })

  const { data: historyData } = useQuery(['payment-history', user.id], async () => {
    const res = await apiClient.get('/payments/history/' + user.id)
    return res.data
  }, { enabled: !!user.id, staleTime: 1000 * 60 })

  const createPaymentMutation = useMutation(
    async ({ planCode, customerId, customerModel }) => {
      const res = await apiClient.post('/payments/create', { planCode, customerId, customerModel })
      return res.data
    },
    {
      onSuccess: (data) => { if (data.checkoutUrl) window.location.href = data.checkoutUrl },
      onError: (err) => alert('Error al crear el pago: ' + (err.response?.data?.error || err.message)),
    }
  )

  const handleSubscribe = (plan) => {
    const customerId = paymentTarget === 'company' && user.company ? user.company : user.id
    const customerModel = paymentTarget === 'company' && user.company ? 'Company' : 'User'
    createPaymentMutation.mutate({ planCode: plan.code, customerId, customerModel })
  }

  const plans = plansData || []
  const history = historyData?.payments || []
  const activeSub = paymentTarget === 'company' ? subCompany : subUser

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pagos y Suscripcion GPS</h1>
          <p className="text-sm text-gray-500 mt-1">Activa o renueva tu plan GPS. Pago seguro con Mercado Pago.</p>
        </div>
        {hasCompany && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
            <button onClick={() => setPaymentTarget('user')}
              className={"px-4 py-2 rounded-xl text-sm font-bold transition-all " + (paymentTarget === 'user' ? 'bg-slate-900 text-white shadow' : 'text-gray-500 hover:text-gray-800')}>
              Personal
            </button>
            <button onClick={() => setPaymentTarget('company')}
              className={"px-4 py-2 rounded-xl text-sm font-bold transition-all " + (paymentTarget === 'company' ? 'bg-slate-900 text-white shadow' : 'text-gray-500 hover:text-gray-800')}>
              Empresa
            </button>
          </div>
        )}
      </div>

      {activeSub && (
        <div className={"rounded-2xl border-2 p-6 " + (activeSub.active ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gray-50 border-gray-200')}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={"w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md " + (activeSub.active ? 'bg-green-500' : 'bg-gray-400')}>
                {activeSub.active ? '✅' : '⏸️'}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Suscripcion {paymentTarget === 'company' ? 'Empresa' : 'Personal'}</p>
                <h2 className="text-xl font-black text-gray-900">
                  {activeSub.hasSubscription ? (activeSub.plan?.name || activeSub.planCode || 'Plan GPS') : 'Sin suscripcion activa'}
                </h2>
                {activeSub.hasSubscription && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    Hasta {activeSub.maxDevices} dispositivo(s) - {activeSub.active ? 'Vence el ' + fmtDate(activeSub.expiresAt) : 'Vencio el ' + fmtDate(activeSub.expiresAt)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
              <span className={"px-3 py-1.5 rounded-xl text-xs font-black border " + (SUB_STATUS[activeSub.status || 'none']?.cls)}>
                {SUB_STATUS[activeSub.status || 'none']?.label}
              </span>
              {activeSub.active && (
                <span className="text-sm font-bold text-green-600">{activeSub.daysLeft} dias restantes</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-black text-gray-800 mb-5">Planes Disponibles</h2>
        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-80 bg-gray-100 rounded-3xl animate-pulse" />)}
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
            <p className="text-yellow-700 font-bold text-sm">Los planes aun no han sido cargados.</p>
            <p className="text-yellow-600 text-xs mt-1">El superadministrador debe ejecutar el seed de planes desde el endpoint POST /api/payments/seed-plans</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isPro = plan.code === 'GPS-EMPRESA-PRO'
              const gradient = PLAN_GRADIENT[plan.code] || 'from-slate-600 to-slate-700'
              const isCurrent = activeSub?.planCode === plan.code && activeSub?.active
              return (
                <div key={plan.code}
                  className={"relative rounded-3xl overflow-hidden border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-white " +
                    (isCurrent ? 'border-green-400 shadow-green-100 shadow-xl' : 'border-gray-100 hover:border-gray-300')}>
                  {isPro && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="text-xs font-black bg-amber-500 text-white px-3 py-1 rounded-full shadow-lg">PRO</span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="text-xs font-black bg-green-500 text-white px-3 py-1 rounded-full shadow-lg">ACTIVO</span>
                    </div>
                  )}
                  <div className={"bg-gradient-to-br " + gradient + " p-6 text-white"}>
                    <div className="text-4xl mb-2">{PLAN_ICONS[plan.code] || '📡'}</div>
                    <h3 className="text-xl font-black leading-tight">{plan.name}</h3>
                    <p className="text-white/80 text-xs mt-1 leading-snug">{plan.description}</p>
                  </div>
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-gray-900">{fmtCLP(plan.price)}</span>
                      <span className="text-sm text-gray-400 font-medium">/ {plan.durationDays} dias</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Hasta {plan.maxDevices} dispositivo{plan.maxDevices > 1 ? 's' : ''} GPS</p>
                  </div>
                  <div className="px-6 py-4">
                    <ul className="space-y-1.5">
                      {(plan.features || []).map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className="text-green-500 font-bold mt-0.5">+</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="px-6 pb-6">
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={createPaymentMutation.isLoading}
                      className={"w-full py-3 rounded-2xl font-black text-sm transition-all shadow-lg disabled:opacity-50 " +
                        (isCurrent
                          ? 'bg-green-50 text-green-700 border-2 border-green-300 hover:bg-green-100'
                          : "bg-gradient-to-r " + gradient + " text-white hover:opacity-90 hover:shadow-xl active:scale-95")}>
                      {createPaymentMutation.isLoading ? 'Redirigiendo...' : isCurrent ? 'Renovar Plan' : 'Suscribirse'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center">
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-6 py-3 shadow-sm">
          <span className="text-xl">🔒</span>
          <div>
            <p className="text-xs font-black text-gray-700">Pago 100% seguro con Mercado Pago</p>
            <p className="text-[10px] text-gray-400">Tarjeta de credito / debito - Transferencia bancaria - Efectivo</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-black text-gray-800 mb-4">Historial de Pagos</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <span className="text-5xl mb-3">🧾</span>
              <p className="font-semibold text-sm">Aun no hay pagos registrados</p>
              <p className="text-xs mt-1">Tus transacciones apareceran aqui despues de suscribirte</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold text-gray-600 text-xs uppercase tracking-wide">Fecha</th>
                    <th className="px-5 py-3 text-left font-bold text-gray-600 text-xs uppercase tracking-wide">Plan</th>
                    <th className="px-5 py-3 text-left font-bold text-gray-600 text-xs uppercase tracking-wide">Monto</th>
                    <th className="px-5 py-3 text-left font-bold text-gray-600 text-xs uppercase tracking-wide">Estado</th>
                    <th className="px-5 py-3 text-left font-bold text-gray-600 text-xs uppercase tracking-wide">Aprobado</th>
                    <th className="px-5 py-3 text-left font-bold text-gray-600 text-xs uppercase tracking-wide">ID MP</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((p) => {
                    const stConfig = STATUS_LABELS[p.status] || STATUS_LABELS.pending
                    return (
                      <tr key={p._id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-gray-500 text-xs">{fmtDate(p.createdAt)}</td>
                        <td className="px-5 py-3">
                          <div className="font-bold text-gray-800">{p.metadata?.planName || p.metadata?.planCode || '-'}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{p.metadata?.planCode}</div>
                        </td>
                        <td className="px-5 py-3 font-black text-gray-900">{fmtCLP(p.amount)}</td>
                        <td className="px-5 py-3">
                          <span className={"px-2.5 py-1 rounded-full text-xs font-bold border " + stConfig.cls}>{stConfig.label}</span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(p.approvedAt)}</td>
                        <td className="px-5 py-3 font-mono text-[10px] text-gray-400">{p.mpPaymentId || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
