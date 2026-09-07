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
  email: string
  status: 'ACTIVO' | 'INACTIVO'
  roles?: Role[]
}

export type UserFilters = {
  q?: string
  status?: string
  page?: number
  per_page?: number
}

export type UserPayload = {
  name: string
  last_name: string | null
  dni: string | null
  email: string
  password?: string | null
  status: 'ACTIVO' | 'INACTIVO'
  roles: string[]
}

export type RolePayload = {
  name: string
  permissions: string[]
}
