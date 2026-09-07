import { api } from '../../api/http'
import type { AuthPayload, LoginResponse } from './types'

type LoginInput = {
  email: string
  password: string
  device_name?: string
}

export async function login(input: LoginInput) {
  const response = await api.post<LoginResponse>('/auth/login', input)

  return response.data
}

export async function getMe() {
  const response = await api.get<AuthPayload>('/auth/me')

  return response.data
}

export async function logout() {
  await api.post('/auth/logout')
}
