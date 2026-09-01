import React, { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import AiCopilotWidget from '../components/AiCopilotWidget'

export default function MainLayout({ children, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar - Desktop */}
      <Sidebar onLogout={onLogout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
          <div className="max-w-[1720px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* 🧠 Copiloto IA Gemini 3.6 - Flotante Web */}
      <AiCopilotWidget />
    </div>
  )
}
