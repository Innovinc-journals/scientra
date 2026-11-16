import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { roleHome } from './roles'

// Route guard (UX only; the backend enforces permissions on every request).
//   <Route element={<ProtectedRoute roles={['STAFF','SUPER_ADMIN']} />}> ...children... </Route>
export function ProtectedRoute({ roles, children }) {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />
  }

  return children || <Outlet />
}
