import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Pencil, Save, Search, ShieldCheck, UserRoundCheck, Users, X } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import { useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { MetricCard } from '../components/common/MetricCard'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import { StatusBadge } from '../features/taller/components/StatusBadge'
import type { PaginatedResponse } from '../types/api'
import {
  createUsuario,
  getRoles,
  getUsuarios,
  updateUsuario,
} from '../features/usuarios/usuariosService'
import type { Role, User, UserFilters, UserPayload } from '../features/usuarios/types'
import { AppLayout } from '../layouts/AppLayout'

function initials(user: User) {
  return `${user.name.charAt(0)}${user.last_name?.charAt(0) ?? ''}`.toUpperCase()
}

function emptyUser(roles: Role[]): UserPayload {
  return {
    name: '',
    last_name: '',
    dni: '',
    username: '',
    email: '',
    password: '',
    status: 'ACTIVO',
    roles: roles[0] ? [roles[0].name] : [],
  }
}

function matchesUserFilters(user: User, filters: UserFilters) {
  const search = filters.q?.trim().toLowerCase()
  const userText = `${user.name} ${user.last_name ?? ''} ${user.dni ?? ''} ${user.username} ${user.email}`.toLowerCase()

  return (!filters.status || user.status === filters.status) && (!search || userText.includes(search))
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)) {
    const errors = error.response?.data.errors
    const firstError = errors ? Object.values(errors).flat()[0] : undefined

    return firstError ?? error.response?.data.message ?? fallback
  }

  return error instanceof Error ? error.message : fallback
}

export function UsuariosPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<UserFilters>({ per_page: 50, page: 1 })
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [userForm, setUserForm] = useState<UserPayload>({
    name: '',
    last_name: '',
    dni: '',
    username: '',
    email: null,
    password: '',
    status: 'ACTIVO',
    roles: [],
  })

  const usuarios = useQuery({
    queryKey: ['usuarios', filters],
    queryFn: () => getUsuarios(filters),
  })
  const roles = useQuery({ queryKey: ['roles'], queryFn: getRoles })

  const counts = useMemo(() => {
    const rows = usuarios.data?.data ?? []

    return {
      activos: rows.filter((user) => user.status === 'ACTIVO').length,
      administradores: rows.filter((user) => user.roles?.some((role) => role.name.includes('ADMIN'))).length,
      tecnicos: rows.filter((user) => user.roles?.some((role) => role.name.includes('TALLER') || role.name.includes('HOROMETROS'))).length,
    }
  }, [usuarios.data?.data])

  const openNewUser = () => {
    setEditingUser(null)
    saveUser.reset()
    setUserForm(emptyUser(roles.data ?? []))
    setIsUserModalOpen(true)
  }

  const openEditUser = (user: User) => {
    setEditingUser(user)
    saveUser.reset()
    setUserForm({
      name: user.name,
      last_name: user.last_name ?? '',
      dni: user.dni ?? '',
      username: user.username,
      email: user.email ?? null,
      password: '',
      status: user.status,
      roles: user.roles?.map((role) => role.name) ?? [],
    })
    setIsUserModalOpen(true)
  }

  const saveUser = useMutation({
    mutationFn: () => {
      const payload: UserPayload = {
        ...userForm,
        last_name: userForm.last_name || null,
        dni: userForm.dni || null,
        email: userForm.email || null,
        password: userForm.password || null,
      }

      if (editingUser) {
        return updateUsuario(editingUser.id, payload)
      }

      return createUsuario(payload)
    },
    onSuccess: (user) => {
      queryClient.setQueryData<PaginatedResponse<User>>(['usuarios', filters], (current) => {
        if (!current) {
          return current
        }

        const exists = current.data.some((item) => item.id === user.id)
        const matchesFilters = matchesUserFilters(user, filters)
        const nextData = exists
          ? current.data.map((item) => (item.id === user.id ? user : item)).filter((item) => matchesUserFilters(item, filters))
          : matchesFilters
            ? [user, ...current.data].slice(0, current.meta.per_page)
            : current.data

        return {
          ...current,
          data: nextData,
          meta: {
            ...current.meta,
            total: exists && !matchesFilters ? Math.max(current.meta.total - 1, 0) : !exists && matchesFilters ? current.meta.total + 1 : current.meta.total,
          },
        }
      })
      setIsUserModalOpen(false)
      setEditingUser(null)
    },
  })

  const updateFilter = (key: keyof UserFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }))
  }

  return (
    <AppLayout title="Usuarios y permisos" description="Gestión de usuarios, roles y permisos por módulo">
      <div className="mb-6 grid gap-5 md:grid-cols-3">
        <MetricCard label="Usuarios activos" value={counts.activos} icon={<Users className="h-7 w-7" aria-hidden="true" />} tone="green" delta="+ 12%" />
        <MetricCard label="Administradores" value={counts.administradores} icon={<ShieldCheck className="h-7 w-7" aria-hidden="true" />} tone="amber" delta="+ 0%" />
        <MetricCard label="Técnicos / Responsables" value={counts.tecnicos} icon={<UserRoundCheck className="h-7 w-7" aria-hidden="true" />} tone="blue" delta="+ 8%" />
      </div>

      <div className="grid gap-5">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input className={`${inputClass} w-full pl-9`} placeholder="Buscar usuario..." value={filters.q ?? ''} onChange={(event) => updateFilter('q', event.target.value)} />
            </div>
            <select className={inputClass} value={filters.status ?? ''} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">Filtrar por estado</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
            <Button variant="secondary" onClick={openNewUser}>
              Nuevo usuario
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full border-collapse text-left text-sm">
              <thead className="bg-white text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="border-b border-slate-100 px-5 py-4">Usuario</th>
                  <th className="border-b border-slate-100 px-5 py-4">DNI</th>
                  <th className="border-b border-slate-100 px-5 py-4">Rol</th>
                  <th className="border-b border-slate-100 px-5 py-4">Módulo</th>
                  <th className="border-b border-slate-100 px-5 py-4">Estado</th>
                  <th className="border-b border-slate-100 px-5 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(usuarios.data?.data ?? []).map((user) => (
                  <tr key={user.id} className="hover:bg-emerald-50/25">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-sm font-black text-emerald-800">{initials(user)}</div>
                        <div>
                          <div className="font-black text-slate-950">{user.name} {user.last_name}</div>
                          <div className="text-xs font-medium text-slate-500">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{user.dni ?? '-'}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-emerald-50 px-3 py-1 font-bold text-emerald-800">{user.roles?.[0]?.name ?? 'Sin rol'}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{moduleLabel(user.roles?.[0]?.name)}</td>
                    <td className="px-5 py-4"><StatusBadge value={user.status} /></td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => openEditUser(user)}
                        className="inline-flex items-center justify-center p-1 text-slate-700 transition-colors hover:text-emerald-800 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-emerald-700"
                        title="Editar usuario"
                        aria-label={`Editar usuario ${user.username}`}
                      >
                        <Pencil className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!usuarios.isLoading && !usuarios.data?.data.length ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm font-medium text-slate-500">No hay usuarios con esos filtros.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <UserPaginationBar
            currentPage={usuarios.data?.meta.current_page ?? 1}
            lastPage={usuarios.data?.meta.last_page ?? 1}
            perPage={usuarios.data?.meta.per_page ?? filters.per_page ?? 50}
            total={usuarios.data?.meta.total ?? 0}
            showing={usuarios.data?.data.length ?? 0}
            onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
          />
        </section>
      </div>

      {isUserModalOpen ? (
        <UserFormModal
          user={editingUser}
          userForm={userForm}
          roles={roles.data ?? []}
          loading={saveUser.isPending}
          error={saveUser.error ? apiErrorMessage(saveUser.error, 'No se pudo guardar el usuario.') : null}
          onClose={() => {
            setIsUserModalOpen(false)
            setEditingUser(null)
          }}
          onChange={setUserForm}
          onSubmit={() => saveUser.mutate()}
        />
      ) : null}
    </AppLayout>
  )
}

function UserPaginationBar({
  currentPage,
  lastPage,
  perPage,
  total,
  showing,
  onPageChange,
}: {
  currentPage: number
  lastPage: number
  perPage: number
  total: number
  showing: number
  onPageChange: (page: number) => void
}) {
  const start = total === 0 ? 0 : ((currentPage - 1) * perPage) + 1
  const end = Math.min((currentPage - 1) * perPage + showing, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm font-medium text-slate-500">
      <span>
        Mostrando {start}-{end} de {total} usuarios
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Anterior
        </Button>
        <span className="rounded-md bg-emerald-700 px-3 py-2 font-black text-white">
          {currentPage} / {lastPage}
        </span>
        <Button
          variant="secondary"
          disabled={currentPage >= lastPage}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}

function UserFormModal({
  user,
  userForm,
  roles,
  loading,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  user: User | null
  userForm: UserPayload
  roles: Role[]
  loading: boolean
  error: string | null
  onClose: () => void
  onChange: Dispatch<SetStateAction<UserPayload>>
  onSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">{user ? 'Editar usuario' : 'Nuevo usuario'}</h2>
            <p className="text-sm font-medium text-slate-500">Mantén roles y estado según los permisos actuales.</p>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" type="button" onClick={onClose} aria-label="Cerrar formulario">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form
          className="grid gap-4 p-5 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <FilterField label="Nombre">
            <input required className={inputClass} value={userForm.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} />
          </FilterField>
          <FilterField label="Apellido">
            <input className={inputClass} value={userForm.last_name ?? ''} onChange={(event) => onChange((current) => ({ ...current, last_name: event.target.value }))} />
          </FilterField>
          <FilterField label="DNI">
            <input className={inputClass} value={userForm.dni ?? ''} onChange={(event) => onChange((current) => ({ ...current, dni: event.target.value }))} />
          </FilterField>
          <FilterField label="Usuario">
            <input required className={inputClass} value={userForm.username} onChange={(event) => onChange((current) => ({ ...current, username: event.target.value }))} />
          </FilterField>
          <FilterField label="Email">
            <input className={inputClass} type="email" value={userForm.email ?? ''} onChange={(event) => onChange((current) => ({ ...current, email: event.target.value || null }))} placeholder="Opcional" />
          </FilterField>
          <FilterField label="Contraseña">
            <input
              required={!user}
              className={inputClass}
              type="password"
              value={userForm.password ?? ''}
              onChange={(event) => onChange((current) => ({ ...current, password: event.target.value }))}
              placeholder={user ? 'Dejar vacío para conservar' : ''}
            />
          </FilterField>
          <FilterField label="Rol">
            <select className={inputClass} value={userForm.roles[0] ?? ''} onChange={(event) => onChange((current) => ({ ...current, roles: event.target.value ? [event.target.value] : [] }))}>
              <option value="">Sin rol</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Estado">
            <select className={inputClass} value={userForm.status} onChange={(event) => onChange((current) => ({ ...current, status: event.target.value as UserPayload['status'] }))}>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </FilterField>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 md:col-span-2">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 md:col-span-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Guardar usuario
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

function moduleLabel(role?: string) {
  if (!role) {
    return '-'
  }

  const modules = []

  if (role.includes('TALLER')) {
    modules.push('Taller')
  }

  if (role.includes('HOROMETROS')) {
    modules.push('Horómetros')
  }

  if (role.includes('ADMIN')) {
    modules.push('Todos')
  }

  return modules.length ? modules.join(', ') : role
}
