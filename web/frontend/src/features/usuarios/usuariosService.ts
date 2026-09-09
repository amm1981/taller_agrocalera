import { api } from '../../api/http'
import type { PaginatedResponse } from '../../types/api'
import type {
  Permission,
  Role,
  RoleFilters,
  RolePayload,
  User,
  UserFilters,
  UserPayload,
  UsuarioAplicativo,
  UsuarioAplicativoImportRow,
  UsuarioAplicativoImportSummary,
  UsuarioAplicativoPayload,
} from './types'

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

export async function getUsuariosAplicativo(filters?: UserFilters) {
  const { data } = await api.get<PaginatedResponse<UsuarioAplicativo>>('/usuarios-aplicativo', {
    params: cleanParams(filters),
  })

  return data
}

export async function createUsuarioAplicativo(payload: UsuarioAplicativoPayload) {
  const { data } = await api.post<DataResponse<UsuarioAplicativo>>('/usuarios-aplicativo', payload)

  return data.data
}

export async function updateUsuarioAplicativo(id: number, payload: UsuarioAplicativoPayload) {
  const { data } = await api.put<DataResponse<UsuarioAplicativo>>(`/usuarios-aplicativo/${id}`, payload)

  return data.data
}

export async function importUsuariosAplicativo(rows: UsuarioAplicativoImportRow[]) {
  const { data } = await api.post<DataResponse<UsuarioAplicativoImportSummary>>('/importaciones/usuarios-aplicativo', { rows })

  return data.data
}

export async function downloadUsuariosAplicativoImportTemplate() {
  const { data } = await api.get<Blob>('/importaciones/usuarios-aplicativo/plantilla', {
    responseType: 'blob',
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
  const data = await getRolesPage({ per_page: 100 })

  return data.data
}

export async function getRolesPage(filters?: RoleFilters) {
  const { data } = await api.get<PaginatedResponse<Role>>('/roles', {
    params: cleanParams(filters),
  })

  return data
}

export async function createRole(payload: RolePayload) {
  const { data } = await api.post<DataResponse<Role>>('/roles', payload)

  return data.data
}

export async function updateRole(id: number, payload: RolePayload) {
  const { data } = await api.put<DataResponse<Role>>(`/roles/${id}`, payload)

  return data.data
}

export async function deleteRole(id: number) {
  await api.delete(`/roles/${id}`)
}

export async function getPermisos() {
  const { data } = await api.get<PaginatedResponse<Permission>>('/permisos', {
    params: { per_page: 100 },
  })

  return data.data
}
