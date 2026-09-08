import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Filter, Pencil, Plus, Save, Search, ShieldCheck, Trash2, X } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import { useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import {
  createRole,
  deleteRole,
  getPermisos,
  getRolesPage,
  updateRole,
} from '../features/usuarios/usuariosService'
import type { Permission, Role, RoleFilters, RolePayload } from '../features/usuarios/types'
import { AppLayout } from '../layouts/AppLayout'

const permissionGroups = [
  { label: 'Taller', prefix: 'taller.' },
  { label: 'Horómetros', prefix: 'horometros.' },
  { label: 'Maestros', prefix: 'maestros.' },
  { label: 'Reportes', prefix: 'reportes.' },
  { label: 'Usuarios', prefix: 'usuarios.' },
]

function emptyRole(): RolePayload {
  return {
    name: '',
    permissions: [],
  }
}

function groupPermissions(permissions: Permission[]) {
  return permissionGroups.map((group) => ({
    ...group,
    permissions: permissions.filter((permission) => permission.name.startsWith(group.prefix)),
  }))
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)) {
    const errors = error.response?.data.errors
    const firstError = errors ? Object.values(errors).flat()[0] : undefined

    return firstError ?? error.response?.data.message ?? fallback
  }

  return error instanceof Error ? error.message : fallback
}

export function RolesPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<RoleFilters>({ q: '', per_page: 50, page: 1 })
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<RolePayload>(emptyRole())

  const roles = useQuery({
    queryKey: ['roles-page', filters],
    queryFn: () => getRolesPage(filters),
  })
  const permisos = useQuery({ queryKey: ['permisos'], queryFn: getPermisos })

  const groupedPermissions = useMemo(() => groupPermissions(permisos.data ?? []), [permisos.data])

  const saveRole = useMutation({
    mutationFn: () => {
      const payload: RolePayload = {
        name: form.name.trim(),
        permissions: form.permissions,
      }

      if (editingRole) {
        return updateRole(editingRole.id, payload)
      }

      return createRole(payload)
    },
    onSuccess: async () => {
      setIsModalOpen(false)
      setEditingRole(null)
      setForm(emptyRole())
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['roles-page'] }),
        queryClient.invalidateQueries({ queryKey: ['roles'] }),
      ])
    },
  })

  const removeRole = useMutation({
    mutationFn: () => {
      if (!deleteTarget) {
        throw new Error('No hay rol seleccionado.')
      }

      return deleteRole(deleteTarget.id)
    },
    onSuccess: async () => {
      setDeleteTarget(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['roles-page'] }),
        queryClient.invalidateQueries({ queryKey: ['roles'] }),
      ])
    },
  })

  const openNewRole = () => {
    saveRole.reset()
    setEditingRole(null)
    setForm(emptyRole())
    setIsModalOpen(true)
  }

  const openEditRole = (role: Role) => {
    saveRole.reset()
    setEditingRole(role)
    setForm({
      name: role.name,
      permissions: role.permissions?.map((permission) => permission.name) ?? [],
    })
    setIsModalOpen(true)
  }

  const updateFilter = (value: string) => {
    setFilters((current) => ({ ...current, q: value, page: 1 }))
  }

  return (
    <AppLayout title="Roles" description="CRUD de roles y permisos del sistema">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              className={`${inputClass} w-full pl-9`}
              placeholder="Buscar rol..."
              value={filters.q ?? ''}
              onChange={(event) => updateFilter(event.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={openNewRole}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo rol
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full border-collapse text-left text-sm">
            <thead className="bg-white text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-100 px-5 py-4">Rol</th>
                <th className="border-b border-slate-100 px-5 py-4">Permisos</th>
                <th className="border-b border-slate-100 px-5 py-4">Módulos</th>
                <th className="border-b border-slate-100 px-5 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(roles.data?.data ?? []).map((role) => (
                <tr key={role.id} className="hover:bg-emerald-50/25">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-800">
                        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="font-black text-slate-950">{role.name}</div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-700">{role.permissions?.length ?? 0}</td>
                  <td className="px-5 py-4 text-slate-700">{moduleLabel(role)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center p-1 text-slate-700 transition-colors hover:text-emerald-800 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-emerald-700"
                        title="Editar rol"
                        aria-label={`Editar rol ${role.name}`}
                        onClick={() => openEditRole(role)}
                      >
                        <Pencil className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center p-1 text-red-600 transition-colors hover:text-red-700 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:text-slate-300"
                        title={role.name === 'ADMINISTRADOR' ? 'El rol administrador no se elimina' : 'Eliminar rol'}
                        aria-label={`Eliminar rol ${role.name}`}
                        disabled={role.name === 'ADMINISTRADOR'}
                        onClick={() => {
                          removeRole.reset()
                          setDeleteTarget(role)
                        }}
                      >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!roles.isLoading && !roles.data?.data.length ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm font-medium text-slate-500">
                    No hay roles con esos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <RolesPaginationBar
          currentPage={roles.data?.meta.current_page ?? 1}
          lastPage={roles.data?.meta.last_page ?? 1}
          perPage={roles.data?.meta.per_page ?? filters.per_page ?? 50}
          total={roles.data?.meta.total ?? 0}
          showing={roles.data?.data.length ?? 0}
          onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
        />
      </section>

      {isModalOpen ? (
        <RoleFormModal
          role={editingRole}
          form={form}
          groupedPermissions={groupedPermissions}
          loading={saveRole.isPending}
          error={saveRole.error ? apiErrorMessage(saveRole.error, 'No se pudo guardar el rol.') : null}
          onClose={() => {
            setIsModalOpen(false)
            setEditingRole(null)
          }}
          onChange={setForm}
          onSubmit={() => saveRole.mutate()}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteRoleModal
          role={deleteTarget}
          loading={removeRole.isPending}
          error={removeRole.error ? apiErrorMessage(removeRole.error, 'No se pudo eliminar el rol.') : null}
          onCancel={() => {
            removeRole.reset()
            setDeleteTarget(null)
          }}
          onConfirm={() => removeRole.mutate()}
        />
      ) : null}
    </AppLayout>
  )
}

function RolesPaginationBar({
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
        Mostrando {start}-{end} de {total} roles
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          Anterior
        </Button>
        <span className="rounded-md bg-emerald-700 px-3 py-2 font-black text-white">
          {currentPage} / {lastPage}
        </span>
        <Button variant="secondary" disabled={currentPage >= lastPage} onClick={() => onPageChange(currentPage + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  )
}

function RoleFormModal({
  role,
  form,
  groupedPermissions,
  loading,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  role: Role | null
  form: RolePayload
  groupedPermissions: Array<{ label: string; permissions: Permission[] }>
  loading: boolean
  error: string | null
  onClose: () => void
  onChange: Dispatch<SetStateAction<RolePayload>>
  onSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">{role ? 'Editar rol' : 'Nuevo rol'}</h2>
            <p className="text-sm font-medium text-slate-500">Define el nombre y los permisos asociados.</p>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" type="button" onClick={onClose} aria-label="Cerrar formulario">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form
          className="grid gap-4 p-5"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <FilterField label="Nombre del rol">
            <input
              required
              className={inputClass}
              value={form.name}
              onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ej. SUPERVISOR_HOROMETROS"
            />
          </FilterField>

          <div className="grid gap-3 md:grid-cols-2">
            {groupedPermissions.map((group) => (
              <section key={group.label} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2 font-black text-slate-950">
                  <Filter className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  {group.label}
                </div>
                <div className="grid gap-2">
                  {group.permissions.map((permission) => (
                    <label key={permission.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                      <span>{permission.name}</span>
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(permission.name)}
                        onChange={(event) =>
                          onChange((current) => ({
                            ...current,
                            permissions: event.target.checked
                              ? [...current.permissions, permission.name]
                              : current.permissions.filter((item) => item !== permission.name),
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Guardar rol
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

function DeleteRoleModal({
  role,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  role: Role
  loading: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-rose-50 text-rose-700">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-950">Eliminar rol</h3>
            <p className="text-sm font-medium text-slate-500">Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          ¿Deseas eliminar el rol <strong className="text-slate-950">{role.name}</strong>?
        </p>
        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button className="bg-rose-700 hover:bg-rose-800" onClick={onConfirm} disabled={loading}>
            Eliminar
          </Button>
        </div>
      </section>
    </div>
  )
}

function moduleLabel(role: Role) {
  const permissions = role.permissions?.map((permission) => permission.name) ?? []
  const modules = permissionGroups
    .filter((group) => permissions.some((permission) => permission.startsWith(group.prefix)))
    .map((group) => group.label)

  return modules.length ? modules.join(', ') : '-'
}
