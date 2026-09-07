import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useAuth } from '../../features/auth/AuthContext'

export function ProtectedRoute() {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f7f4]">
        <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <LoaderCircle className="h-4 w-4 animate-spin text-emerald-700" aria-hidden="true" />
          Cargando sesión
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
