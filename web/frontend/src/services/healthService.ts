import { api } from '../api/http'
import type { HealthResponse } from '../types/health'

export async function getApiHealth() {
  const response = await api.get<HealthResponse>('/health')

  return response.data
}
