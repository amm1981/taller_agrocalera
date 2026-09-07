import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AxiosError } from 'axios'
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../components/ui/button'
import { useAuth } from '../features/auth/AuthContext'

const loginSchema = z.object({
  usuario: z.string().min(1, 'Ingresa tu usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type LoginValues = z.infer<typeof loginSchema>

type LocationState = {
  from?: {
    pathname?: string
  }
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      usuario: '',
      password: '',
    },
  })

  async function onSubmit(values: LoginValues) {
    setError(null)

    try {
      await login(values)
      navigate(state?.from?.pathname ?? '/', { replace: true })
    } catch (caught) {
      if (caught instanceof AxiosError) {
        setError(caught.response?.data?.message ?? 'No se pudo iniciar sesión.')
        return
      }

      setError('No se pudo iniciar sesión.')
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7f4] px-4 py-8">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            className="mx-auto h-auto max-h-20 w-64 object-contain"
            src="/assets/logos_Taller-21.webp"
            alt="Taller AgroCalera"
          />
        </div>

        <form
          className="rounded-md border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-emerald-50 text-emerald-800">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Iniciar sesión</h2>
              <p className="text-sm text-slate-500">Acceso administrativo</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Usuario</span>
              <input
                className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                type="text"
                autoComplete="username"
                {...register('usuario')}
              />
              {errors.usuario ? (
                <span className="mt-1 block text-sm text-rose-700">{errors.usuario.message}</span>
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Contraseña</span>
              <div className="relative mt-1">
                <input
                  className="h-11 w-full rounded-md border border-slate-200 px-3 pr-11 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-emerald-800"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password ? (
                <span className="mt-1 block text-sm text-rose-700">{errors.password.message}</span>
              ) : null}
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <Button className="mt-6 w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Entrar
          </Button>
        </form>
      </section>
    </main>
  )
}
