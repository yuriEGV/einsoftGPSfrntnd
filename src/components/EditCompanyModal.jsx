import React, { useState, useEffect } from 'react'
import { apiClient } from '../services/api'

export default function EditCompanyModal({ isOpen, onClose, company, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    isActive: true,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        city: company.city || '',
        country: company.country || 'Chile',
        isActive: company.isActive !== undefined ? company.isActive : true,
      })
      setError(null)
      setSuccessMsg(null)
    }
  }, [company, isOpen])

  if (!isOpen || !company) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('La razón social o nombre de la empresa es obligatorio.')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      await apiClient.put(`/companies/${company._id}`, form)
      setSuccessMsg('✅ Cuenta corporativa actualizada con éxito.')
      if (onSuccess) {
        onSuccess()
      }
      setTimeout(() => {
        setSuccessMsg(null)
        onClose()
      }, 1200)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar la empresa.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 text-white w-full max-w-lg rounded-3xl shadow-2xl border border-cyan-500/30 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-cyan-950/60 to-slate-900 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-2xl text-cyan-400">
              🏢
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Modificar Cuenta de Empresa
              </h2>
              <p className="text-xs text-slate-400">
                Editar parámetros y razón social de <span className="text-cyan-300 font-bold">{company.name}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          {error && (
            <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs font-bold">
              {successMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Razón Social / Nombre *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-bold"
              placeholder="Ej: Placeres Corp"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Correo de Contacto
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-cyan-500 transition"
                placeholder="contacto@empresa.cl"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Teléfono Central
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-cyan-500 transition font-mono"
                placeholder="+56 9 1234 5678"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Dirección Matriz / Calle
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-cyan-500 transition"
              placeholder="Av. Providencia 1234"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Ciudad
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-cyan-500 transition"
                placeholder="Santiago / Valparaíso"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                País
              </label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-cyan-500 transition"
                placeholder="Chile"
              />
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Estado Operativo de la Cuenta
            </label>
            <select
              value={form.isActive ? 'active' : 'inactive'}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-cyan-500 transition font-bold"
            >
              <option value="active">🟢 ACTIVA (Acceso telemático y monitoreo habilitado)</option>
              <option value="inactive">⚪ INACTIVA (Suspendida / En pausa)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black shadow-lg shadow-cyan-900/30 transition flex items-center gap-1.5 active:scale-95"
            >
              <span>💾</span>
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
