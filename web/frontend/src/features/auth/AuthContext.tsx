import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { clearStoredToken, getStoredToken, storeToken } from './authStorage'
import { getMe, login, logout } from './authService'
import type { AuthPayload } from './types'

type LoginValues = {
  email: string
  password: string
}

type AuthContextValue = {
  session: AuthPayload | null
  isLoading: boolean
  login: (values: LoginValues) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthPayload | null>(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(getStoredToken()))
  const queryClient = useQueryClient()

  useEffect(() => {
    let active = true

    async function loadSession() {
      const token = getStoredToken()

      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const payload = await getMe()

        if (active) {
          setSession(payload)
        }
      } catch {
        clearStoredToken()
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadSession()

    return () => {
      active = false
    }
  }, [])

  const handleLogin = useCallback(
    async (values: LoginValues) => {
      const payload = await login({
        ...values,
        device_name: 'agrocontrol-web',
      })

      storeToken(payload.token)
      setSession({
        user: payload.user,
        roles: payload.roles,
        permissions: payload.permissions,
      })
      await queryClient.invalidateQueries()
    },
    [queryClient],
  )

  const handleLogout = useCallback(async () => {
    try {
      await logout()
    } finally {
      clearStoredToken()
      setSession(null)
      queryClient.clear()
    }
  }, [queryClient])

  const value = useMemo(
    () => ({
      session,
      isLoading,
      login: handleLogin,
      logout: handleLogout,
    }),
    [handleLogin, handleLogout, isLoading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
