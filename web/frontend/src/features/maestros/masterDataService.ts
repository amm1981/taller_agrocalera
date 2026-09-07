import { api } from '../../api/http'
import type { PaginatedResponse } from '../../types/api'
import type { ApiEntity, Personal, Vehiculo } from '../taller/types'

export async function getGerencias() {
  const { data } = await api.get<PaginatedResponse<ApiEntity>>('/gerencias', {
    params: { per_page: 100 },
  })

  return data.data
}

export async function getVehiculos() {
  const { data } = await api.get<PaginatedResponse<Vehiculo>>('/vehiculos', {
    params: { per_page: 100 },
  })

  return data.data
}

export async function getTecnicos() {
  const { data } = await api.get<PaginatedResponse<Personal>>('/personal', {
    params: { tipo: 'TECNICO', estado: 'ACTIVO', per_page: 100 },
  })

  return data.data
}

export async function getOperarios() {
  const { data } = await api.get<PaginatedResponse<Personal>>('/personal', {
    params: { tipo: 'OPERARIO', estado: 'ACTIVO', per_page: 100 },
  })

  return data.data
}
