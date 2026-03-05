import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
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
import PrivateRoute from './components/PrivateRoute'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchInterval: 1000 * 10, // 10 seconds
    },
  },
})

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'))

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />

          <Route
            path="/driver"
            element={
              <PrivateRoute
                isAuthenticated={isAuthenticated}
                allowedRoles={['driver']}
              >
                <DriverDashboard onLogout={handleLogout} />
              </PrivateRoute>
            }
          />

          <Route
            path="/*"
            element={
              <PrivateRoute
                isAuthenticated={isAuthenticated}
                allowedRoles={['admin', 'fleet_manager']}
              >
                <MainLayout onLogout={handleLogout}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/companies" element={<Companies />} />
                    <Route path="/vehicles" element={<Vehicles />} />
                    <Route path="/vehicles/:id" element={<VehicleDetail />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/geofences" element={<Geofences />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </MainLayout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App
