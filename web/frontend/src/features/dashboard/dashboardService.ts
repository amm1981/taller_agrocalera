import { api } from '../../api/http'
import { getApiHealth } from '../../services/healthService'
import type { HealthResponse } from '../../types/health'
import type { PaginatedResponse } from '../../types/api'

type TallerDashboard = {
  ordenes: {
    pendientes: number
    en_curso: number
    esperando_repuesto: number
    backlog: number
    finalizadas: number
  }
  repuestos: {
    solicitados: number
    disponibles: number
    entregados: number
  }
}

type HorometrosDashboard = {
  fecha: string
  inicios_registrados: number
  pendientes_cierre: number
  completos: number
  observados: number
}

type VehiculoSummary = {
  id: number
  codigo: string
  nombre: string | null
  estado: string
  activo: boolean
}

export type DashboardSummary = {
  health: HealthResponse
  flota: {
    activos: number
    fueraServicio: number
  }
  taller: TallerDashboard
  horometros: HorometrosDashboard
  actividad: string[]
}

async function getCount(path: string) {
  const response = await api.get<PaginatedResponse<unknown>>(path, {
    params: { per_page: 1 },
  })

  return response.data.meta.total
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [health, activos, fueraServicio, taller, horometros, ultimasOrdenes] =
    await Promise.all([
      getApiHealth(),
      getCount('/vehiculos?activo=true'),
      getCount('/vehiculos?estado=FUERA_DE_SERVICIO'),
      api.get<{ data: TallerDashboard }>('/taller/dashboard').then((response) => response.data.data),
      api.get<{ data: HorometrosDashboard }>('/horometros/dashboard').then((response) => response.data.data),
      api
        .get<PaginatedResponse<VehiculoSummary>>('/vehiculos', {
          params: { per_page: 3 },
        })
        .then((response) => response.data.data),
    ])

  return {
    health,
    flota: {
      activos,
      fueraServicio,
    },
    taller,
    horometros,
    actividad: ultimasOrdenes.map((vehiculo) => `${vehiculo.codigo} - ${vehiculo.estado}`),
  }
}
