import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { apiClient } from '../services/api'

export default function PaymentSuccess() {
  const [params] = useSearchParams()
  const paymentId = params.get('payment_id')
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!paymentId) { setLoading(false); return }
    apiClient.get('/payments/' + paymentId)
      .then(r => setPayment(r.data.payment))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [paymentId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="text-7xl mb-4 animate-bounce">✅</div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Pago Exitoso</h1>
        <p className="text-gray-500 text-sm mb-6">Tu servicio GPS ha sido activado correctamente</p>
        {loading && <p className="text-gray-400 text-xs mb-6">Cargando detalles del pago...</p>}
        {payment && (
          <div className="bg-green-50 rounded-2xl p-5 mb-6 text-left space-y-2 border border-green-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Plan</span>
              <span className="font-black text-gray-800">{payment.metadata?.planName || payment.metadata?.planCode}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Monto</span>
              <span className="font-black text-green-700">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(payment.amount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Estado</span>
              <span className="font-black text-green-700 uppercase">{payment.status}</span>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-3">
          <Link to="/" className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-black text-sm hover:opacity-90 transition-all">
            Ir al Panel GPS
          </Link>
          <Link to="/payments" className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all">
            Ver Suscripcion
          </Link>
        </div>
      </div>
    </div>
  )
}
