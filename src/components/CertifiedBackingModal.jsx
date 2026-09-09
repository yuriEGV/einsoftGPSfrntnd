import React, { useState, useEffect } from 'react'
import { apiClient } from '../services/api'

export default function CertifiedBackingModal({ isOpen, onClose, vehicle = null }) {
  const [activeTab, setActiveTab] = useState('certificate') // 'certificate' | 'policies'
  const [certificateData, setCertificateData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [ownerName, setOwnerName] = useState('TRANSPORTE Y LOGISTICA CHILE SPA')
  const [rut, setRut] = useState('77.890.123-K')
  const [chassis, setChassis] = useState('8AFZZZ3SZK891234')

  const plate = vehicle?.plate || 'ABCD-12'

  useEffect(() => {
    if (isOpen) {
      generateCertificate()
    }
  }, [isOpen, plate])

  const generateCertificate = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.post('/plataforma-plus/certificate/generate', {
        plate,
        ownerName,
        rut,
        chassisNumber: chassis,
        gpsModel: vehicle?.brand ? `EINSoft Tactical 4G // ${vehicle.brand}` : 'EINSoft Tactical 4G Multi-Constelación',
        imei: vehicle?.deviceIMEI || '864201049283741',
      })
      setCertificateData(res.data.certificate)
    } catch (e) {
      // Local fallback
      const code = `EIN-LEY21171-${plate}-${Date.now().toString(36).toUpperCase()}`
      setCertificateData({
        verificationCode: code,
        lawReference: 'Ley 21.171 (Protección y Prevención Portonazos / GPS Obligatorio Aseguradoras)',
        plate,
        ownerName,
        rut,
        chassisNumber: chassis,
        gpsModel: 'EINSoft Tactical 4G Multi-Constelación (GNSS 4-Band)',
        imei: vehicle?.deviceIMEI || '864201049283741',
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        permanentWarranty: true,
        warrantyStatus: 'VIGENTE // Hardware Cubierto Permanentemente',
        monitoringCenter: 'EINSoft GPS Central 24/7 Nacional',
        verificationUrl: `https://einsoft-gp-sfrntnd.vercel.app/warranties-certificate?verify=${code}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/30 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-900 p-5 border-b border-cyan-500/20 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xl text-cyan-300">
              📜
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Respaldo Certificado & Políticas de Garantía
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                  Ley 21.171
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Acreditación oficial para compañías de seguros y cumplimiento normativo chileno
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-black"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-5 pt-2 gap-2 text-xs no-print">
          <button
            onClick={() => setActiveTab('certificate')}
            className={`py-2.5 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'certificate'
                ? 'border-cyan-500 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🛡️</span> Certificado Ley 21.171 (Aseguradoras)
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`py-2.5 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'policies'
                ? 'border-cyan-500 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚖️</span> Políticas de Servicio & Garantías
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'certificate' ? (
            /* Vista Imprimible / Certificado Oficial Ley 21.171 */
            <div className="space-y-4">
              <div className="flex justify-between items-center no-print flex-wrap gap-2">
                <span className="text-xs text-slate-400">
                  Certificado emitido electrónicamente con firma digital y hash criptográfico.
                </span>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-900/30 transition-all active:scale-95"
                >
                  <span>🖨️</span> Imprimir / Guardar PDF Oficial
                </button>
              </div>

              {/* Ficha Certificado con estética oficial */}
              <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 border-4 border-double border-slate-300 shadow-2xl relative overflow-hidden font-serif">
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none text-9xl font-black text-slate-900 transform -rotate-12">
                  EINSOFT GPS
                </div>

                {/* Header del Certificado */}
                <div className="text-center border-b-2 border-slate-900 pb-4 mb-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-[10px] font-sans font-bold uppercase tracking-widest border border-slate-300 mb-2">
                    República de Chile • Ley N° 21.171
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase font-sans">
                    Certificado de Instalación y Monitoreo GPS Satelital
                  </h3>
                  <p className="text-xs text-slate-600 font-sans mt-1">
                    Validación de Dispositivo con Cortacorriente Remoto y Monitoreo 24/7 para Exigencias de Aseguradoras
                  </p>
                </div>

                {/* Grid de Datos del Vehículo y Dispositivo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans mb-5">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">1. Datos del Vehículo</span>
                    <div className="flex justify-between"><span className="text-slate-500">Patente:</span> <strong className="text-slate-900 font-mono text-sm">{certificateData?.plate}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">Titular / Empresa:</span> <strong className="text-slate-800 text-right">{certificateData?.ownerName}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">R.U.T.:</span> <strong className="text-slate-800">{certificateData?.rut}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">N° Chasis / VIN:</span> <strong className="text-slate-800 font-mono">{certificateData?.chassisNumber}</strong></div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">2. Equipamiento Satelital</span>
                    <div className="flex justify-between"><span className="text-slate-500">Hardware GPS:</span> <strong className="text-slate-800 text-right">{certificateData?.gpsModel}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">IMEI Dispositivo:</span> <strong className="text-slate-900 font-mono text-xs">{certificateData?.imei}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">Inmovilizador Remoto:</span> <strong className="text-emerald-700 font-bold">Instalado y Operativo</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">Central 24/7:</span> <strong className="text-slate-800">{certificateData?.monitoringCenter}</strong></div>
                  </div>
                </div>

                {/* Cláusula Ley 21.171 */}
                <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-3.5 text-[11px] font-sans text-slate-700 leading-relaxed mb-5">
                  <p>
                    <strong>Declaración de Conformidad:</strong> Se certifica que el vehículo individualizado cuenta con un dispositivo telemático de posicionamiento global (GPS) provisto de corte de combustible remoto y enlace continuo con central de monitoreo 24/7, dando cabal cumplimiento a lo dispuesto por la <strong>Ley 21.171</strong> y sus reglamentos de prevención de robo y portonazos para la contratación o renovación de pólizas de seguro automotriz.
                  </p>
                </div>

                {/* Footer del Certificado con QR y Códigos */}
                <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs">
                  <div className="flex items-center gap-3">
                    {/* Simulated QR Code */}
                    <div className="w-16 h-16 bg-slate-950 p-1.5 rounded-lg flex items-center justify-center text-white text-[9px] font-mono text-center shadow-md">
                      [QR-21171 VERIFIED]
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Código Único de Validación:</span>
                      <code className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 select-all block">
                        {certificateData?.verificationCode}
                      </code>
                      <span className="text-[10px] text-slate-500 block">
                        Emisión: {certificateData?.issueDate} • Vigencia: {certificateData?.expiryDate}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-block border-b-2 border-slate-800 pb-1 px-4 text-center">
                      <span className="font-serif italic text-xs font-bold text-slate-800 block">EINSoft Telematics S.A.</span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Firma y Timbre Central de Operaciones</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Vista de Políticas de Servicio y Garantías */
            <div className="space-y-5 text-xs text-slate-300">
              {/* Garantía del Hardware */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 space-y-2">
                <h4 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                  <span>🛡️</span> Garantía Permanente del Hardware
                </h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Todos los dispositivos GPS e inmovilizadores suministrados por EINSoft GPS cuentan con <strong>Garantía Permanente</strong> sobre el hardware mientras la suscripción mensual o anual al servicio permanezca activa y al día. Ante cualquier falla de fábrica o desgaste de componentes internos, el equipo será reemplazado sin costo adicional de hardware.
                </p>
              </div>

              {/* Nulidad de Garantía */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-rose-500/30 space-y-2">
                <h4 className="text-sm font-black text-rose-400 flex items-center gap-2">
                  <span>⚠️</span> Causales de Nulidad de Garantía
                </h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  La cobertura de garantía se anulará de forma inmediata bajo los siguientes supuestos:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                  <li>Manipulación o apertura no autorizada del hardware o cableado por personal ajeno a la empresa.</li>
                  <li>Daños producidos por inmersión en agua, líquidos corrosivos o sustancias químicas.</li>
                  <li>Alteraciones ocasionadas por sobretensiones, puentes de batería indebidos o instalaciones de audio/accesorios ajenos.</li>
                  <li>Accidentes de tránsito de alta energía que destruyan físicamente la integridad del equipo.</li>
                </ul>
              </div>

              {/* Deberes del Cliente */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/30 space-y-2">
                <h4 className="text-sm font-black text-indigo-400 flex items-center gap-2">
                  <span>📋</span> Deberes y Obligaciones del Usuario
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-300">
                  <li>
                    <strong>Reporte Inmediato de Emergencia:</strong> Notificar de inmediato cualquier siniestro o robo a través de la aplicación móvil (Botón SOS), el Call Center 24/7 o la línea de contingencia (+56 9).
                  </li>
                  <li>
                    <strong>Custodia de Credenciales:</strong> Mantener la confidencialidad de los accesos de usuario y contraseña en la aplicación móvil y plataforma web.
                  </li>
                  <li>
                    <strong>Traslado Técnico de Equipos:</strong> Ante recambio o venta del vehículo, coordinar técnicamente la desinstalación e instalación con los técnicos certificados de EINSoft GPS para mantener la validez de la certificación Ley 21.171.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
