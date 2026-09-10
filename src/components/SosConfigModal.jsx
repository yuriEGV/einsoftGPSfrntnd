import React, { useState, useEffect } from 'react'
import { apiClient } from '../services/api'

export default function SosConfigModal({ isOpen, onClose, onSaveConfig }) {
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [centralName, setCentralName] = useState('Central de Seguridad 24/7')
  const [secondaryPhone, setSecondaryPhone] = useState('')
  const [contactName, setContactName] = useState('')
  const [whatsappAlerts, setWhatsappAlerts] = useState(true)
  const [autoDial, setAutoDial] = useState(true)
  const [policeDispatch133, setPoliceDispatch133] = useState(true)
  const [pdiDispatch134, setPdiDispatch134] = useState(true)
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (isOpen) {
      loadSavedConfig()
    }
  }, [isOpen])

  const loadSavedConfig = async () => {
    // 1. Try local storage first
    try {
      const local = localStorage.getItem('einsoft_sos_config')
      if (local) {
        const parsed = JSON.parse(local)
        applyConfig(parsed)
      }
    } catch (_) {}

    // 2. Fetch from backend
    try {
      const res = await apiClient.get('/plataforma-plus/sos-config')
      if (res.data?.config) {
        applyConfig(res.data.config)
      }
    } catch (err) {
      console.warn('Could not load remote SOS config:', err)
    }
  }

  const applyConfig = (cfg) => {
    if (cfg.emergencyPhone !== undefined) setEmergencyPhone(cfg.emergencyPhone || '')
    if (cfg.centralName !== undefined) setCentralName(cfg.centralName || 'Central de Seguridad 24/7')
    if (cfg.secondaryPhone !== undefined) setSecondaryPhone(cfg.secondaryPhone || '')
    if (cfg.contactName !== undefined) setContactName(cfg.contactName || '')
    if (cfg.whatsappAlerts !== undefined) setWhatsappAlerts(Boolean(cfg.whatsappAlerts))
    if (cfg.autoDial !== undefined) setAutoDial(Boolean(cfg.autoDial))
    if (cfg.policeDispatch133 !== undefined) setPoliceDispatch133(Boolean(cfg.policeDispatch133))
    if (cfg.pdiDispatch134 !== undefined) setPdiDispatch134(Boolean(cfg.pdiDispatch134))
    if (cfg.notes !== undefined) setNotes(cfg.notes || '')
  }

  if (!isOpen) return null

  const handleSave = async (e) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const cleanedPhone = emergencyPhone.trim()
    if (!cleanedPhone) {
      setErrorMsg('Por favor ingresa un número de teléfono para la Central o Contacto de Emergencia.')
      return
    }

    setIsSaving(true)
    const payload = {
      emergencyPhone: cleanedPhone,
      centralName: centralName.trim() || 'Central de Seguridad 24/7',
      secondaryPhone: secondaryPhone.trim(),
      contactName: contactName.trim(),
      whatsappAlerts,
      autoDial,
      policeDispatch133,
      pdiDispatch134,
      notes: notes.trim(),
    }

    try {
      // Save locally
      localStorage.setItem('einsoft_sos_config', JSON.stringify(payload))

      // Save to backend
      await apiClient.put('/plataforma-plus/sos-config', payload)

      setSuccessMsg('✅ Configuración de Emergencia SOS guardada con éxito.')
      if (onSaveConfig) {
        onSaveConfig(payload)
      }

      setTimeout(() => {
        setSuccessMsg(null)
        onClose()
      }, 1200)
    } catch (err) {
      // Even if backend fails, local storage holds it
      setSuccessMsg('✅ Configuración guardada en este dispositivo.')
      if (onSaveConfig) {
        onSaveConfig(payload)
      }
      setTimeout(() => {
        setSuccessMsg(null)
        onClose()
      }, 1200)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 text-white w-full max-w-lg rounded-3xl shadow-2xl border border-purple-500/30 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-purple-950/60 to-slate-900 border-b border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-2xl text-red-400">
              🚨
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Configuración Botón SOS
              </h2>
              <p className="text-xs text-purple-200/80">
                Define con antelación la Central y números de auxilio
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

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto text-xs">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs font-bold">
              {successMsg}
            </div>
          )}

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="font-mono text-cyan-400 text-xs uppercase tracking-wider font-bold flex items-center gap-1.5">
              <span>📞</span> 1. Contacto Telefónico Principal
            </h3>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Número Telefónico a Marcar (Obligatorio) <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                placeholder="+56 9 1234 5678 (o tu número directo)"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                required
              />
              <span className="text-[10px] text-slate-400">
                Al activar el SOS, la plataforma llamará directamente a este número sin inventar contactos falsos.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  Nombre de la Central o Responsable
                </label>
                <input
                  type="text"
                  placeholder="Ej: Central Seguridad 24/7"
                  value={centralName}
                  onChange={(e) => setCentralName(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  Teléfono Secundario (Opcional)
                </label>
                <input
                  type="tel"
                  placeholder="+56 9 8765 4321"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
            <h3 className="font-mono text-cyan-400 text-xs uppercase tracking-wider font-bold flex items-center gap-1.5">
              <span>🛡️</span> 2. Protocolos de Reacción Inmediata
            </h3>

            <label className="flex items-start gap-2 cursor-pointer p-2 rounded-xl hover:bg-slate-900/60 transition">
              <input
                type="checkbox"
                checked={whatsappAlerts}
                onChange={(e) => setWhatsappAlerts(e.target.checked)}
                className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500"
              />
              <div>
                <span className="font-bold text-slate-200 text-xs block">
                  📲 Generar Enlace WhatsApp SOS con Coordenadas GPS
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Permite despachar un mensaje pre-armado con ubicación en Google Maps al número configurado.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2 cursor-pointer p-2 rounded-xl hover:bg-slate-900/60 transition">
              <input
                type="checkbox"
                checked={policeDispatch133}
                onChange={(e) => setPoliceDispatch133(e.target.checked)}
                className="mt-0.5 rounded text-red-600 focus:ring-red-500"
              />
              <div>
                <span className="font-bold text-slate-200 text-xs block">
                  🚓 Protocolo de Despacho Carabineros de Chile (133)
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Incluye folio de emergencia satelital certificado para entrega inmediata a la autoridad.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2 cursor-pointer p-2 rounded-xl hover:bg-slate-900/60 transition">
              <input
                type="checkbox"
                checked={pdiDispatch134}
                onChange={(e) => setPdiDispatch134(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-bold text-slate-200 text-xs block">
                  🚨 Protocolo Encargo por Robo PDI (134)
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Emite pre-alerta de encargo por robo o portonazo para búsqueda en flagrancia.
                </span>
              </div>
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">
              Instrucciones Especiales / Notas para el Operador
            </label>
            <input
              type="text"
              placeholder="Ej: Flota con custodia nocturna, verificar conductor antes de inmovilizar"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-cyan-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-900/30 transition flex items-center gap-1.5 active:scale-95"
            >
              <span>💾</span>
              <span>{isSaving ? 'Guardando...' : 'Guardar Configuración SOS'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
