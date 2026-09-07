import axios from 'axios'
import { getStoredToken } from '../features/auth/authStorage'

function resolveApiUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL as string | undefined
  const hostname = window.location.hostname
  const isLocalBrowser = hostname === 'localhost' || hostname === '127.0.0.1'
  const configuredIsLoopback = configuredUrl?.includes('127.0.0.1') || configuredUrl?.includes('localhost')

  if (!isLocalBrowser && (!configuredUrl || configuredIsLoopback)) {
    return `${window.location.protocol}//${hostname}:8000/api`
  }

  return configuredUrl ?? 'http://127.0.0.1:8000/api'
}

export const api = axios.create({
  baseURL: resolveApiUrl(),
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})
