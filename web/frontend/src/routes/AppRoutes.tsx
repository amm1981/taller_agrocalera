import { Route, Routes } from 'react-router-dom'
import { GuestRoute } from '../components/common/GuestRoute'
import { ProtectedRoute } from '../components/common/ProtectedRoute'
import { AppVersionPage } from '../pages/AppVersionPage'
import { DashboardPage } from '../pages/DashboardPage'
import { HorometrosDashboardPage } from '../pages/HorometrosDashboardPage'
import { HorometrosConfiguracionPage } from '../pages/HorometrosConfiguracionPage'
import { HorometrosPendientesPage } from '../pages/HorometrosPendientesPage'
import { HorometrosRegistrosPage } from '../pages/HorometrosRegistrosPage'
import { HorometrosReportesPage } from '../pages/HorometrosReportesPage'
import { HorometrosValidacionesPage } from '../pages/HorometrosValidacionesPage'
import { LoginPage } from '../pages/LoginPage'
import { MaestrosPage } from '../pages/MaestrosPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { RolesPage } from '../pages/RolesPage'
import { TallerBacklogPage } from '../pages/TallerBacklogPage'
import { TallerDashboardPage } from '../pages/TallerDashboardPage'
import { TallerOrdenDetallePage } from '../pages/TallerOrdenDetallePage'
import { TallerOrdenesPage } from '../pages/TallerOrdenesPage'
import { TallerPreventivoPage } from '../pages/TallerPreventivoPage'
import { TallerReportesPage } from '../pages/TallerReportesPage'
import { TallerRepuestosPage } from '../pages/TallerRepuestosPage'
import { UsuariosPage } from '../pages/UsuariosPage'
import { UsuariosAplicativoPage } from '../pages/UsuariosAplicativoPage'
import { Vehiculo360Page } from '../pages/Vehiculo360Page'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/taller" element={<TallerDashboardPage />} />
        <Route path="/taller/ordenes" element={<TallerOrdenesPage />} />
        <Route path="/taller/ordenes/:id" element={<TallerOrdenDetallePage />} />
        <Route path="/taller/repuestos" element={<TallerRepuestosPage />} />
        <Route path="/taller/preventivo" element={<TallerPreventivoPage />} />
        <Route path="/taller/backlog" element={<TallerBacklogPage />} />
        <Route path="/taller/reportes" element={<TallerReportesPage />} />
        <Route path="/horometros" element={<HorometrosDashboardPage />} />
        <Route path="/horometros/registros" element={<HorometrosRegistrosPage />} />
        <Route path="/horometros/pendientes" element={<HorometrosPendientesPage />} />
        <Route path="/horometros/validaciones" element={<HorometrosValidacionesPage />} />
        <Route path="/horometros/configuracion" element={<HorometrosConfiguracionPage />} />
        <Route path="/horometros/reportes" element={<HorometrosReportesPage />} />
        <Route path="/maestros" element={<MaestrosPage />} />
        <Route path="/vehiculos/:id" element={<Vehiculo360Page />} />
        <Route path="/usuarios" element={<UsuariosPage />} />
        <Route path="/usuarios/aplicativo" element={<UsuariosAplicativoPage />} />
        <Route path="/usuarios/roles" element={<RolesPage />} />
        <Route path="/configuracion/version-apk" element={<AppVersionPage />} />
        <Route
          path="/configuracion"
          element={
            <PlaceholderPage
              title="Configuración"
              description="Parámetros generales de la plataforma."
            />
          }
        />
      </Route>
    </Routes>
  )
}
