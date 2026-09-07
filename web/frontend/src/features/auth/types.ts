export type AuthUser = {
  id: number
  name: string
  last_name: string | null
  dni: string | null
  username: string | null
  email: string
  status: 'ACTIVO' | 'INACTIVO'
  last_login_at: string | null
}

export type AuthPayload = {
  user: AuthUser
  roles: string[]
  permissions: string[]
}

export type LoginResponse = AuthPayload & {
  token: string
  token_type: 'Bearer'
}
