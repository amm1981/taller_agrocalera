export type Permission = {
  id: number
  name: string
}

export type Role = {
  id: number
  name: string
  permissions?: Permission[]
}

export type User = {
  id: number
  name: string
  last_name: string | null
  dni: string | null
  username: string
  email: string | null
  status: 'ACTIVO' | 'INACTIVO'
  roles?: Role[]
}

export type UserFilters = {
  q?: string
  status?: string
  page?: number
  per_page?: number
}

export type UsuarioAplicativo = {
  id: number
  personal_id: number | null
  nombre: string
  usuario: string
  estado: 'ACTIVO' | 'INACTIVO'
  ultimo_login_at: string | null
  personal?: {
    id: number
    dni: string
    nombres: string
    apellidos: string
    tipo: string
  } | null
  tipos_vehiculo?: Array<{
    id: number
    nombre: string
    estado: 'ACTIVO' | 'INACTIVO'
  }>
}

export type UsuarioAplicativoPayload = {
  personal_id: number | null
  nombre: string
  usuario: string
  password?: string | null
  estado: 'ACTIVO' | 'INACTIVO'
  tipo_vehiculo_ids: number[]
}

export type RoleFilters = {
  q?: string
  page?: number
  per_page?: number
}

export type UserPayload = {
  name: string
  last_name: string | null
  dni: string | null
  username: string
  email: string | null
  password?: string | null
  status: 'ACTIVO' | 'INACTIVO'
  roles: string[]
}

export type RolePayload = {
  name: string
  permissions: string[]
}
