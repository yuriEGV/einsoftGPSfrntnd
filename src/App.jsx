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

// ─── RoleGuard: redirige si el usuario no tiene el rol requerido ──────────────
function RoleGuard({ allowedRoles, children, fallback = '/' }) {
  const user = JSON.parse(safeStorage.get('user') || '{}')
  const token = safeStorage.get('token')

  if (!token || !user.role) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) return <Navigate to={fallback} replace />
  return children
}

// ─── AuthGuard: redirige a login si no autenticado, a /driver si es conductor ─
function AuthGuard({ children }) {
  const user = JSON.parse(safeStorage.get('user') || '{}')
  const token = safeStorage.get('token')

  if (!token || !user.role) return <Navigate to="/login" replace />
  if (user.role === 'driver') return <Navigate to="/driver" replace />
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

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* ── Login ── */}
          <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />

          {/* ── Dashboard del Conductor — acceso exclusivo para drivers ── */}
          <Route
            path="/driver"
            element={
              isAuthenticated && user.role === 'driver'
                ? <DriverDashboard onLogout={handleLogout} />
                : <Navigate to={isAuthenticated ? '/' : '/login'} replace />
            }
          />

          {/* ── Layout principal — todos excepto drivers ── */}
          <Route
            path="/*"
            element={
              <AuthGuard>
                <MainLayout onLogout={handleLogout}>
                  <Routes>
                    {/* Panel principal — admin, fleet_manager, independent */}
                    <Route path="/" element={<Dashboard />} />

                    {/* Empresas/Clientes — solo superadmin (admin sin empresa) */}
                    <Route
                      path="/companies"
                      element={
                        <RoleGuard allowedRoles={['admin']}>
                          <Companies />
                        </RoleGuard>
                      }
                    />

                    {/* Vehículos — admin, fleet_manager, independent */}
                    <Route
                      path="/vehicles"
                      element={
                        <RoleGuard allowedRoles={['admin', 'fleet_manager', 'independent']}>
                          <Vehicles />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="/vehicles/:id"
                      element={
                        <RoleGuard allowedRoles={['admin', 'fleet_manager', 'independent']}>
                          <VehicleDetail />
                        </RoleGuard>
                      }
                    />

                    {/* Reportes — admin, fleet_manager, independent */}
                    <Route
                      path="/reports"
                      element={
                        <RoleGuard allowedRoles={['admin', 'fleet_manager', 'independent']}>
                          <Reports />
                        </RoleGuard>
                      }
                    />

                    {/* Alertas — admin, fleet_manager, independent */}
                    <Route
                      path="/alerts"
                      element={
                        <RoleGuard allowedRoles={['admin', 'fleet_manager', 'independent']}>
                          <Alerts />
                        </RoleGuard>
                      }
                    />

                    {/* Geocercas — admin, fleet_manager, independent */}
                    <Route
                      path="/geofences"
                      element={
                        <RoleGuard allowedRoles={['admin', 'fleet_manager', 'independent']}>
                          <Geofences />
                        </RoleGuard>
                      }
                    />

                    {/* Usuarios — solo admin y fleet_manager */}
                    <Route
                      path="/users"
                      element={
                        <RoleGuard allowedRoles={['admin', 'fleet_manager']} fallback="/">
                          <Users />
                        </RoleGuard>
                      }
                    />

                    {/* Configuración — admin, fleet_manager, independent */}
                    <Route
                      path="/settings"
                      element={
                        <RoleGuard allowedRoles={['admin', 'fleet_manager', 'independent']}>
                          <Settings />
                        </RoleGuard>
                      }
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
