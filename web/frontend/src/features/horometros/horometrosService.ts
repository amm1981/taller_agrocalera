import { api } from '../../api/http'
import type { PaginatedResponse } from '../../types/api'
import type {
  HorometroDashboard,
  HorometroConfiguracion,
  HorometroFilters,
  HorometroReaperturasBoard,
  HorometroRegistro,
  HorometrosReporte,
  CrearReaperturaPayload,
  RegistrarCierrePayload,
  RegistrarInicioPayload,
} from './types'

type DataResponse<T> = {
  data: T
}

function cleanParams<T extends Record<string, string | number | boolean | undefined>>(params?: T) {
  return Object.fromEntries(
    Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== ''),
  )
}

export async function getHorometrosDashboard(filters?: HorometroFilters) {
  const { data } = await api.get<DataResponse<HorometroDashboard>>('/horometros/dashboard', {
    params: cleanParams(filters),
  })

  return data.data
}

export async function getHorometroRegistros(filters?: HorometroFilters) {
  const { data } = await api.get<PaginatedResponse<HorometroRegistro>>('/horometros/registros', {
    params: cleanParams(filters),
  })

  return data
}

export async function exportHorometroRegistros(filters?: HorometroFilters) {
  const { data } = await api.get<Blob>('/horometros/registros/export', {
    params: cleanParams({ ...filters, page: undefined, per_page: undefined }),
    responseType: 'blob',
  })

  return data
}

export async function getHorometroPendientes(filters?: HorometroFilters) {
  const { data } = await api.get<PaginatedResponse<HorometroRegistro>>('/horometros/pendientes', {
    params: cleanParams(filters),
  })

  return data
}

export async function getHorometroValidaciones(filters?: HorometroFilters) {
  const { data } = await api.get<PaginatedResponse<HorometroRegistro>>('/horometros/validaciones', {
    params: cleanParams(filters),
  })

  return data
}

export async function registrarInicio(payload: RegistrarInicioPayload) {
  const { data } = await api.post<DataResponse<HorometroRegistro>>('/horometros/inicio', payload)

  return data.data
}

export async function registrarCierre(id: number, payload: RegistrarCierrePayload) {
  const { data } = await api.post<DataResponse<HorometroRegistro>>(
    `/horometros/${id}/cierre`,
    payload,
  )

  return data.data
}

export async function reabrirHorometro(id: number, tipoRegistro: 'INICIO' | 'CIERRE', motivo: string, vigenciaMinutos?: number) {
  const { data } = await api.post(`/horometros/${id}/reabrir`, {
    tipo_registro: tipoRegistro,
    motivo,
    vigencia_minutos: vigenciaMinutos,
  })

  return data.data
}

export async function getHorometroReaperturas(filters?: HorometroFilters) {
  const { data } = await api.get<DataResponse<HorometroReaperturasBoard>>('/horometros/reaperturas', {
    params: cleanParams(filters),
  })

  return data.data
}

export async function crearHorometroReaperturas(payload: CrearReaperturaPayload) {
  const { data } = await api.post<DataResponse<{ creadas: number }>>('/horometros/reaperturas', payload)

  return data.data
}

export async function getHorometroConfiguracion() {
  const { data } = await api.get<DataResponse<HorometroConfiguracion>>('/horometros/configuracion')

  return data.data
}

export async function updateHorometroConfiguracion(payload: Omit<HorometroConfiguracion, 'id'>) {
  const { data } = await api.put<DataResponse<HorometroConfiguracion>>('/horometros/configuracion', payload)

  return data.data
}

export async function anularHorometro(id: number) {
  const { data } = await api.post<DataResponse<HorometroRegistro>>(`/horometros/${id}/anular`)

  return data.data
}

export async function getHorometrosReporte(filters?: Pick<HorometroFilters, 'fecha_desde' | 'fecha_hasta'>) {
  const { data } = await api.get<DataResponse<HorometrosReporte>>('/horometros/reportes', {
    params: cleanParams(filters),
  })

  return data.data
}
