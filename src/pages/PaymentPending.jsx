import React from 'react'
import { Link } from 'react-router-dom'

export default function PaymentPending() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="text-7xl mb-4 animate-pulse">⏳</div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Pago Pendiente</h1>
        <p className="text-gray-500 text-sm mb-8">Tu pago esta siendo procesado. Te notificaremos cuando se confirme y tu GPS sea activado.</p>
        <div className="flex flex-col gap-3">
          <Link to="/payments" className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-sm hover:opacity-90 transition-all">
            Ver Estado del Pago
          </Link>
          <Link to="/" className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all">
            Volver al Panel
          </Link>
        </div>
      </div>
    </div>
  )
}
