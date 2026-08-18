import React, { useState, useRef, useEffect } from 'react'
import { apiClient } from '../services/api'

function renderFormattedText(text) {
  if (!text) return ''
  let clean = text.replace(/<b>/g, '**').replace(/<\/b>/g, '**')
  const parts = clean.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-black text-purple-200">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function AiCopilotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '👋 ¡Hola! Soy **Gemini 3.6 AI**, el copiloto inteligente de **EINSoft GPS**.\n\nPuedo responder preguntas sobre la flota, ubicar vehículos, revisar alertas o generar diagnósticos en tiempo real.\n\n¿En qué te puedo ayudar hoy?',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSend = async (customText = null) => {
    const textToSend = customText || input
    if (!textToSend.trim() || isLoading) return

    const newMessages = [...messages, { role: 'user', text: textToSend }]
    setMessages(newMessages)
    if (!customText) setInput('')
    setIsLoading(true)

    try {
      // Build history for API
      const history = newMessages.slice(1, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }))

      const res = await apiClient.post('/bot/chat', {
        prompt: textToSend,
        history,
      })

      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: res.data.response || '✅ Consulta procesada.' },
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: '⚠️ Error al conectar con la IA de Gemini: ' + (err.response?.data?.error || err.message),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const quickPrompts = [
    { label: '📊 Diagnóstico de Flota', prompt: 'Dame un resumen general y diagnóstico de la flota ahora mismo.' },
    { label: '🚗 Vehículos Activos', prompt: '¿Qué vehículos están actualmente activos y en movimiento?' },
    { label: '🚨 Alertas y Pánicos', prompt: '¿Hay alertas críticas o botones de pánico activos?' },
    { label: '👥 Estado de Personas', prompt: '¿Cuál es el estado y ubicación del personal rastreado?' },
  ]

  return (
    <div className="fixed bottom-6 right-6 z-[9999] no-print font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold px-4 py-3.5 rounded-full shadow-2xl transition-all transform hover:scale-105 border border-purple-300/30"
        >
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </span>
          <span className="text-xl">🧠</span>
          <div className="text-left leading-tight hidden sm:block">
            <div className="text-xs font-black tracking-wide">Copiloto IA Gemini</div>
            <div className="text-[10px] text-purple-200 font-medium">Asistente de Flota Online</div>
          </div>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[420px] h-[580px] bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950 p-4 border-b border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-purple-500/30">
                  🧠
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div>
                <h3 className="font-black text-sm text-white flex items-center gap-2">
                  Copiloto IA Gemini 3.6
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                    PRO
                  </span>
                </h3>
                <p className="text-[11px] text-purple-300/70">Asistente inteligente de monitoreo de flota</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors text-lg"
            >
              ✕
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="bg-slate-950/60 p-2.5 border-b border-slate-800 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q.prompt)}
                disabled={isLoading}
                className="whitespace-nowrap text-[11px] font-semibold bg-slate-800/80 hover:bg-purple-900/60 text-purple-200 border border-purple-500/20 hover:border-purple-400/50 rounded-xl px-2.5 py-1 transition-all disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-950/40">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center text-xs text-purple-200 shrink-0 mt-0.5">
                    🧠
                  </div>
                )}
                <div
                  className={`max-w-[84%] text-xs rounded-2xl p-3 leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none shadow-md shadow-purple-600/20 font-medium'
                      : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-none shadow-sm whitespace-pre-wrap'
                  }`}
                >
                  {renderFormattedText(m.text)}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-purple-400 bg-purple-950/40 border border-purple-500/20 p-2.5 rounded-2xl w-fit">
                <span className="animate-spin text-base">⏳</span>
                <span>Gemini analizando datos en tiempo real...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta a la IA (ej: ¿dónde está BBTD-23?)..."
              disabled={isLoading}
              className="flex-1 bg-slate-950 border border-slate-700/70 focus:border-purple-500 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold p-2.5 rounded-xl text-xs transition-all shadow-md shadow-purple-600/30 flex items-center justify-center shrink-0"
            >
              ➔
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
