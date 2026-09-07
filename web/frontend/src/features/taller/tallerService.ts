import { api } from '../../api/http'
import type { PaginatedResponse } from '../../types/api'
import type {
  OrdenTrabajo,
  OrdenTrabajoFilters,
  RepuestoFilters,
  SolicitudRepuesto,
  TallerBacklogReporte,
  TallerDashboard,
  TallerEquipoReporte,
  TallerTecnicoReporte,
  TallerTiemposReporte,
} from './types'

type DataResponse<T> = {
  data: T
}

function cleanParams<T extends Record<string, string | number | undefined>>(params?: T) {
  return Object.fromEntries(
    Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== ''),
  )
}

export async function getTallerDashboard() {
  const { data } = await api.get<DataResponse<TallerDashboard>>('/taller/dashboard')

  return data.data
}

export async function getOrdenes(filters?: OrdenTrabajoFilters) {
  const { data } = await api.get<PaginatedResponse<OrdenTrabajo>>('/taller/ordenes', {
    params: cleanParams(filters),
  })

  return data
}

export async function getOrden(id: string | number) {
  const { data } = await api.get<DataResponse<OrdenTrabajo>>(`/taller/ordenes/${id}`)

  return data.data
}

export async function getRepuestos(filters?: RepuestoFilters) {
  const { data } = await api.get<PaginatedResponse<SolicitudRepuesto>>('/taller/repuestos', {
    params: cleanParams(filters),
  })

  return data
}

export async function updateRepuesto(
  id: number,
  payload: Pick<
    SolicitudRepuesto,
    'descripcion_solicitada' | 'codigo_sap' | 'descripcion_sap' | 'cantidad' | 'observacion'
  >,
) {
  const { data } = await api.put<DataResponse<SolicitudRepuesto>>(`/taller/repuestos/${id}`, payload)

  return data.data
}

export async function marcarRepuestoDisponible(id: number) {
  const { data } = await api.post<DataResponse<SolicitudRepuesto>>(
    `/taller/repuestos/${id}/marcar-disponible`,
  )

  return data.data
}

export async function confirmarRecojoRepuesto(id: number) {
  const { data } = await api.post<DataResponse<SolicitudRepuesto>>(
    `/taller/repuestos/${id}/confirmar-recojo`,
  )

  return data.data
}

export async function getBacklog(page = 1) {
  const { data } = await api.get<PaginatedResponse<OrdenTrabajo>>('/taller/backlog', {
    params: { page, per_page: 30 },
  })

  return data
}

export async function resolverBacklog(id: number) {
  const { data } = await api.post<DataResponse<OrdenTrabajo>>(`/taller/backlog/${id}/resolver`)

  return data.data
}

export async function getReporteTiempos() {
  const { data } = await api.get<DataResponse<TallerTiemposReporte>>('/taller/reportes/tiempos')

  return data.data
}

export async function getReporteEquipos() {
  const { data } = await api.get<DataResponse<TallerEquipoReporte[]>>('/taller/reportes/equipos')

  return data.data
}

export async function getReporteTecnicos() {
  const { data } = await api.get<DataResponse<TallerTecnicoReporte[]>>('/taller/reportes/tecnicos')

  return data.data
}

export async function getReporteBacklog() {
  const { data } = await api.get<DataResponse<TallerBacklogReporte[]>>('/taller/reportes/backlog')

  return data.data
}
