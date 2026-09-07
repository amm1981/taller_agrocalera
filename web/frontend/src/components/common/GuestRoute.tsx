import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'

export function GuestRoute() {
  const { session } = useAuth()

  if (session) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
