import React from 'react'
import { Navigate } from 'react-router-dom'

export default function PrivateRoute({ isAuthenticated, allowedRoles, children }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role;

  if (!isAuthenticated) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Si es un driver intentando entrar al admin, mandarlo a /driver
    if (userRole === 'driver') return <Navigate to="/driver" />;
    // De lo contrario mandarlo al home o login
    return <Navigate to="/" />;
  }

  return children;
}
