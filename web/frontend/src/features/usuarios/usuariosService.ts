import { api } from '../../api/http'
import type { PaginatedResponse } from '../../types/api'
import type { Permission, Role, RolePayload, User, UserFilters, UserPayload } from './types'

type DataResponse<T> = {
  data: T
}

function cleanParams<T extends Record<string, string | number | undefined>>(params?: T) {
  return Object.fromEntries(
    Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== ''),
  )
}

export async function getUsuarios(filters?: UserFilters) {
  const { data } = await api.get<PaginatedResponse<User>>('/usuarios', {
    params: cleanParams(filters),
  })

  return data
}

export async function createUsuario(payload: UserPayload) {
  const { data } = await api.post<DataResponse<User>>('/usuarios', payload)

  return data.data
}

export async function updateUsuario(id: number, payload: UserPayload) {
  const { data } = await api.put<DataResponse<User>>(`/usuarios/${id}`, payload)

  return data.data
}

export async function getRoles() {
  const { data } = await api.get<PaginatedResponse<Role>>('/roles', {
    params: { per_page: 100 },
  })

  return data.data
}

export async function createRole(payload: RolePayload) {
  const { data } = await api.post<DataResponse<Role>>('/roles', payload)

  return data.data
}

export async function updateRole(id: number, payload: RolePayload) {
  const { data } = await api.put<DataResponse<Role>>(`/roles/${id}`, payload)

  return data.data
}

export async function getPermisos() {
  const { data } = await api.get<PaginatedResponse<Permission>>('/permisos', {
    params: { per_page: 100 },
  })

  return data.data
}
