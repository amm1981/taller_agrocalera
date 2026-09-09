import { api } from '../../api/http'
import type { PaginatedResponse } from '../../types/api'

export type AppVersion = {
  id: number
  version_code: number
  version_name: string
  message: string | null
  required: boolean
  download_url: string | null
  apk_path: string
  original_filename: string | null
  file_size: number | null
  published_at: string | null
  created_at: string | null
  creator: {
    id: number
    name: string
    username: string | null
    email: string | null
  } | null
}

export type AppVersionPayload = {
  version_code: string
  version_name: string
  message: string
  required: boolean
  apk: File | null
}

type DataResponse<T> = {
  data: T
}

export async function getCurrentAppVersion() {
  const { data } = await api.get<DataResponse<AppVersion | null>>('/app/version')

  return data.data
}

export async function getAppVersions(page = 1) {
  const { data } = await api.get<PaginatedResponse<AppVersion>>('/app-versiones', {
    params: { page },
  })

  return data
}

export async function createAppVersion(payload: AppVersionPayload) {
  const formData = new FormData()
  formData.append('version_code', payload.version_code)
  formData.append('version_name', payload.version_name)
  formData.append('message', payload.message)
  formData.append('required', payload.required ? '1' : '0')

  if (payload.apk) {
    formData.append('apk', payload.apk)
  }

  const { data } = await api.post<DataResponse<AppVersion>>('/app-versiones', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data.data
}
