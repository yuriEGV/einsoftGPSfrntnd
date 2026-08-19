import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { safeStorage } from './services/api'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import VehicleDetail from './pages/VehicleDetail'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Vehicles from './pages/Vehicles'
import Alerts from './pages/Alerts'
import Geofences from './pages/Geofences'
import Companies from './pages/Companies'
import Users from './pages/Users'
import DriverDashboard from './pages/DriverDashboard'
import MobileGpsDashboard from './pages/MobileGpsDashboard'
import PublicTracker from './pages/PublicTracker'
import PeopleTracker from './pages/PeopleTracker'
import PublicPersonTracker from './pages/PublicPersonTracker'
import DownloadApp from './pages/DownloadApp'
import MainLayout from './layouts/MainLayout'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      refetchInterval: 1000 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Normalize role helper
function getNormalizedRole(user) {
  let r = user?.role || ''
  if (r === 'fleet_manager') return 'admin'
  if (r === 'independent') return 'mobile_gps_user'
  return r
}

// ─── RoleGuard: redirige si el usuario no tiene el rol requerido ──────────────
function RoleGuard({ allowedRoles, children, fallback = '/' }) {
  const user = JSON.parse(safeStorage.get('user') || '{}')
  const token = safeStorage.get('token')

  if (!token || !user.role) return <Navigate to="/login" replace />
  const currentRole = getNormalizedRole(user)
  if (!allowedRoles.includes(user.role) && !allowedRoles.includes(currentRole)) {
    return <Navigate to={fallback} replace />
  }
  return children
}

// ─── AuthGuard: redirige a login si no autenticado, a /driver o /mobile-gps según rol ─
function AuthGuard({ children }) {
  const user = JSON.parse(safeStorage.get('user') || '{}')
  const token = safeStorage.get('token')

  if (!token || !user.role) return <Navigate to="/login" replace />
  if (user.role === 'driver') return <Navigate to="/driver" replace />
  if (user.role === 'mobile_gps_user' || user.role === 'independent') return <Navigate to="/mobile-gps" replace />
  return children
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = safeStorage.get('token')
    const user = safeStorage.get('user')
    return !!(token && user)
  })

  const handleLogout = () => {
    safeStorage.remove('token')
    safeStorage.remove('refreshToken')
    safeStorage.remove('user')
    setIsAuthenticated(false)
    queryClient.clear()
  }

  const user = JSON.parse(safeStorage.get('user') || '{}')
  const normalizedRole = getNormalizedRole(user)

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* ── Login ── */}
          <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />

          {/* ── Rastreador Móvil Directo por Celular ── */}
          <Route path="/track/:id" element={<PublicTracker />} />
          <Route path="/person-track/:code" element={<PublicPersonTracker />} />

          {/* ── Dashboard del Conductor — acceso exclusivo para drivers ── */}
          <Route
            path="/driver"
            element={
              isAuthenticated && user.role === 'driver'
                ? <DriverDashboard onLogout={handleLogout} />
                : <Navigate to={isAuthenticated ? '/' : '/login'} replace />
            }
          />

          {/* ── Dashboard del Usuario Celular GPS — acceso exclusivo para móviles en terreno ── */}
          <Route
            path="/mobile-gps"
            element={
              isAuthenticated && (user.role === 'mobile_gps_user' || user.role === 'independent')
                ? <MobileGpsDashboard onLogout={handleLogout} />
                : <Navigate to={isAuthenticated ? '/' : '/login'} replace />
            }
          />

          {/* ── Layout principal — para roles de administración, monitoreo, supervisión, cliente y auditor ── */}
          <Route
            path="/*"
            element={
              <AuthGuard>
                <MainLayout onLogout={handleLogout}>
                  <Routes>
                    {/* Panel principal */}
                    <Route path="/" element={<Dashboard />} />

                    {/* Empresas/Clientes — Superadmin y Admin */}
                    <Route
                      path="/companies"
                      element={
                        <RoleGuard allowedRoles={['superadmin', 'admin']}>
                          <Companies />
                        </RoleGuard>
                      }
                    />

                    {/* Vehículos — Superadmin, Admin, Operador, Supervisor, Cliente, Auditor */}
                    <Route
                      path="/vehicles"
                      element={
                        <RoleGuard allowedRoles={['superadmin', 'admin', 'operator', 'supervisor', 'client', 'auditor', 'fleet_manager', 'independent']}>
                          <Vehicles />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="/vehicles/:id"
                      element={
                        <RoleGuard allowedRoles={['superadmin', 'admin', 'operator', 'supervisor', 'client', 'auditor', 'fleet_manager', 'independent']}>
                          <VehicleDetail />
                        </RoleGuard>
                      }
                    />

                    {/* Rastreo Personal & Celulares */}
                    <Route
                      path="/people-tracker"
                      element={
                        <RoleGuard allowedRoles={['superadmin', 'admin', 'operator', 'supervisor', 'auditor', 'fleet_manager', 'independent']}>
                          <PeopleTracker />
                        </RoleGuard>
                      }
                    />

                    {/* Reportes */}
                    <Route
                      path="/reports"
                      element={
                        <RoleGuard allowedRoles={['superadmin', 'admin', 'operator', 'supervisor', 'client', 'auditor', 'fleet_manager', 'independent']}>
                          <Reports />
                        </RoleGuard>
                      }
                    />

                    {/* Alertas */}
                    <Route
                      path="/alerts"
                      element={
                        <RoleGuard allowedRoles={['superadmin', 'admin', 'operator', 'supervisor', 'auditor', 'fleet_manager', 'independent']}>
                          <Alerts />
                        </RoleGuard>
                      }
                    />

                    {/* Geocercas */}
                    <Route
                      path="/geofences"
                      element={
                        <RoleGuard allowedRoles={['superadmin', 'admin', 'operator', 'supervisor', 'auditor', 'fleet_manager', 'independent']}>
                          <Geofences />
                        </RoleGuard>
                      }
                    />

                    {/* Usuarios */}
                    <Route
                      path="/users"
                      element={
                        <RoleGuard allowedRoles={['superadmin', 'admin', 'supervisor', 'auditor', 'fleet_manager']} fallback="/">
                          <Users />
                        </RoleGuard>
                      }
                    />

                    {/* Configuración */}
                    <Route
                      path="/settings"
                      element={
                        <RoleGuard allowedRoles={['superadmin', 'admin', 'fleet_manager', 'independent']}>
                          <Settings />
                        </RoleGuard>
                      }
                    />

                    {/* Descargar App Celular APK */}
                    <Route
                      path="/download-app"
                      element={<DownloadApp />}
                    />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </MainLayout>
              </AuthGuard>
            }
          />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App
