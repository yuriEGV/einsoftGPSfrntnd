import React from 'react'
import { Link } from 'react-router-dom'

export default function PaymentFailed() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="text-7xl mb-4">❌</div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Pago No Procesado</h1>
        <p className="text-gray-500 text-sm mb-8">El pago fue rechazado o cancelado. No se realizaron cargos a tu cuenta.</p>
        <div className="flex flex-col gap-3">
          <Link to="/payments" className="w-full py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl font-black text-sm hover:opacity-90 transition-all">
            Intentar de Nuevo
          </Link>
          <Link to="/" className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all">
            Volver al Panel
          </Link>
        </div>
      </div>
    </div>
  )
}
