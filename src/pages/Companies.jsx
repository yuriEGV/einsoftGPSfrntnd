import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '../services/api'

export default function Companies() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  })

  const { data: companies = [], isLoading } = useQuery('companies', async () => {
    const response = await apiClient.get('/companies')
    return response.data
  })

  const createMutation = useMutation(
    () => apiClient.post('/companies', form),
    {
      onSuccess: () => {
        setForm({
          name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          country: '',
        })
        queryClient.invalidateQueries('companies')
      },
    },
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name) return
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">🏢 Clientes & Empresas</h1>
          <p className="text-xs text-gray-500 mt-1">Cuentas corporativas, empresas clientes y entidades familiares</p>
        </div>
        <p className="text-sm font-bold text-gray-600 bg-white px-3.5 py-1.5 rounded-xl border border-gray-200 shadow-xs">
          Total: {companies.length} Clientes / Empresas
        </p>
      </div>

      {/* Normalization Explanatory Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-blue-900 text-xs shadow-xs">
        <span className="text-2xl">💡</span>
        <div className="space-y-1">
          <p className="font-bold text-blue-950 text-sm">¿Qué representa un Cliente / Empresa en EINSoft GPS?</p>
          <p className="text-blue-800 leading-relaxed">
            Es la <strong>cuenta matriz u organización</strong> (ej. <em>Constructora del Mar S.A.</em>, <em>Transportes Gómez</em> o <em>Familia Valenzuela</em>) a la que pertenecen los vehículos de flota y los dispositivos móviles de rastreo. Los <strong>Usuarios</strong> son las personas que acceden con contraseña a administrar o consultar esta empresa.
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="card-header">🏢 Registrar Nuevo Cliente / Empresa</h2>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Correo</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Ciudad</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">País</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Guardar empresa
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 className="card-header">Empresas registradas</h2>
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Cargando...</div>
        ) : companies.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No hay empresas registradas.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Nombre</th>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Contacto</th>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Ubicación</th>
                <th className="px-4 py-2 text-left text-gray-700 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c._id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium">
                    {c.name}
                    <div className="text-xs text-blue-600 font-normal">
                      {c.vehicleCount || 0} vehículos vinculados
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {c.email}<br />
                    <span className="text-xs">{c.phone}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {c.address}<br />
                    <span className="text-xs">{c.city} {c.country}</span>
                  </td>
                  <td className="px-4 py-2">
                    {c.isActive ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                        Activa
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                        Inactiva
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

