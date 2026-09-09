import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Download, FileSpreadsheet, KeyRound, Pencil, Save, Search, Smartphone, Trash2, Upload, X } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import { useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { getMasterRecords, getTiposVehiculoMaster } from '../features/maestros/maestrosService'
import type { PersonalMaster } from '../features/maestros/types'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import { StatusBadge } from '../features/taller/components/StatusBadge'
import {
  createUsuarioAplicativo,
  deleteUsuarioAplicativo,
  downloadUsuariosAplicativoImportTemplate,
  getUsuariosAplicativo,
  importUsuariosAplicativo,
  updateUsuarioAplicativo,
} from '../features/usuarios/usuariosService'
import type { UsuarioAplicativo, UsuarioAplicativoImportRow, UsuarioAplicativoImportSummary, UsuarioAplicativoPayload, UserFilters } from '../features/usuarios/types'
import { AppLayout } from '../layouts/AppLayout'
import type { PaginatedResponse } from '../types/api'

type ExcelCell = string | number | boolean | Date | null | undefined

const appUserImportColumns: Array<keyof UsuarioAplicativoImportRow> = [
  'dni_personal',
  'nombre',
  'usuario',
  'contrasena',
  'tipos_registro',
  'estado',
]

function emptyPayload(): UsuarioAplicativoPayload {
  return {
    personal_id: null,
    nombre: '',
    usuario: '',
    password: '',
    estado: 'ACTIVO',
    tipo_vehiculo_ids: [],
  }
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)) {
    const errors = error.response?.data.errors
    const firstError = errors ? Object.values(errors).flat()[0] : undefined

    return firstError ?? error.response?.data.message ?? fallback
  }

  return error instanceof Error ? error.message : fallback
}

function matchesFilters(user: UsuarioAplicativo, filters: UserFilters) {
  const search = filters.q?.trim().toLowerCase()
  const text = `${user.nombre} ${user.usuario} ${user.personal?.dni ?? ''}`.toLowerCase()

  return (!filters.status || user.estado === filters.status) && (!search || text.includes(search))
}

function cellText(value: ExcelCell): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  return String(value).trim()
}

async function parseUsuariosAplicativoImportWorkbook(file: File): Promise<UsuarioAplicativoImportRow[]> {
  const { readSheet } = await import('read-excel-file/browser')
  const rawRows = await readSheet(file) as ExcelCell[][]

  if (!rawRows.length) {
    throw new Error('El archivo Excel no contiene filas.')
  }

  const headerRow = rawRows[0].map(cellText)
  const missing = ['usuario', 'tipos_registro'].filter((column) => !headerRow.includes(column))

  if (missing.length) {
    throw new Error(`Faltan columnas: ${missing.join(', ')}`)
  }

  const rows: UsuarioAplicativoImportRow[] = []

  rawRows.slice(1).forEach((rawRow) => {
    const row = headerRow.reduce<Partial<UsuarioAplicativoImportRow>>((accumulator, header, index) => {
      if (appUserImportColumns.includes(header as keyof UsuarioAplicativoImportRow)) {
        const value = cellText(rawRow[index])

        if (value !== '') {
          accumulator[header as keyof UsuarioAplicativoImportRow] = value
        }
      }

      return accumulator
    }, {})

    if (row.usuario) {
      rows.push(row as UsuarioAplicativoImportRow)
    }
  })

  if (!rows.length) {
    throw new Error('El archivo Excel no contiene usuarios para importar.')
  }

  return rows
}

export function UsuariosAplicativoPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<UserFilters>({ page: 1, per_page: 50 })
  const [editing, setEditing] = useState<UsuarioAplicativo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UsuarioAplicativo | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<UsuarioAplicativoPayload>(emptyPayload())
  const [importRows, setImportRows] = useState<UsuarioAplicativoImportRow[]>([])
  const [importFileName, setImportFileName] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<UsuarioAplicativoImportSummary | null>(null)

  const usuarios = useQuery({
    queryKey: ['usuarios-aplicativo', filters],
    queryFn: () => getUsuariosAplicativo(filters),
  })
  const tiposVehiculo = useQuery({ queryKey: ['tipos-vehiculo-app-users'], queryFn: getTiposVehiculoMaster })
  const personal = useQuery({
    queryKey: ['personal-app-users'],
    queryFn: async () => {
      const data = await getMasterRecords('personal', { estado: 'ACTIVO', per_page: 500 })
      return data.data.filter((item): item is PersonalMaster => 'dni' in item)
    },
  })

  const counts = useMemo(() => {
    const rows = usuarios.data?.data ?? []

    return {
      total: rows.length,
      activos: rows.filter((item) => item.estado === 'ACTIVO').length,
      multiples: rows.filter((item) => (item.tipos_vehiculo?.length ?? 0) > 1).length,
    }
  }, [usuarios.data?.data])

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        password: form.password || null,
      }

      return editing ? updateUsuarioAplicativo(editing.id, payload) : createUsuarioAplicativo(payload)
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<PaginatedResponse<UsuarioAplicativo>>(['usuarios-aplicativo', filters], (current) => {
        if (!current) {
          return current
        }

        const exists = current.data.some((item) => item.id === saved.id)
        const nextData = exists
          ? current.data.map((item) => (item.id === saved.id ? saved : item)).filter((item) => matchesFilters(item, filters))
          : matchesFilters(saved, filters)
            ? [saved, ...current.data].slice(0, current.meta.per_page)
            : current.data

        return {
          ...current,
          data: nextData,
          meta: {
            ...current.meta,
            total: exists ? current.meta.total : current.meta.total + 1,
          },
        }
      })
      setModalOpen(false)
      setEditing(null)
    },
  })

  const bulkImport = useMutation({
    mutationFn: () => {
      if (!importRows.length) {
        throw new Error('Selecciona un archivo .xlsx antes de importar.')
      }

      return importUsuariosAplicativo(importRows)
    },
    onMutate: () => {
      setImportError(null)
      setImportSummary(null)
    },
    onSuccess: async (summary) => {
      setImportSummary(summary)
      setImportRows([])
      setImportFileName(null)
      await queryClient.invalidateQueries({ queryKey: ['usuarios-aplicativo'] })
    },
    onError: (error) => {
      setImportError(error instanceof Error ? error.message : 'No se pudieron importar los usuarios aplicativo.')
    },
  })

  const remove = useMutation({
    mutationFn: () => {
      if (!deleteTarget) {
        throw new Error('Selecciona un usuario aplicativo para eliminar.')
      }

      return deleteUsuarioAplicativo(deleteTarget.id)
    },
    onSuccess: async () => {
      setDeleteTarget(null)
      await queryClient.invalidateQueries({ queryKey: ['usuarios-aplicativo'] })
    },
  })

  const downloadTemplate = async () => {
    const blob = await downloadUsuariosAplicativoImportTemplate()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'importador_usuarios_aplicativo.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = async (file: File | null) => {
    setImportError(null)
    setImportSummary(null)

    if (!file) {
      setImportRows([])
      setImportFileName(null)
      return
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setImportRows([])
      setImportFileName(null)
      setImportError('El importador debe ser un archivo .xlsx.')
      return
    }

    try {
      const rows = await parseUsuariosAplicativoImportWorkbook(file)

      setImportRows(rows)
      setImportFileName(file.name)
    } catch (error) {
      setImportRows([])
      setImportFileName(file.name)
      setImportError(error instanceof Error ? error.message : 'No se pudo leer el archivo Excel.')
    }
  }

  const openNew = () => {
    setEditing(null)
    save.reset()
    setForm(emptyPayload())
    setModalOpen(true)
  }

  const openEdit = (user: UsuarioAplicativo) => {
    setEditing(user)
    save.reset()
    setForm({
      personal_id: user.personal_id,
      nombre: user.nombre,
      usuario: user.usuario,
      password: '',
      estado: user.estado,
      tipo_vehiculo_ids: user.tipos_vehiculo?.map((tipo) => tipo.id) ?? [],
    })
    setModalOpen(true)
  }

  return (
    <AppLayout title="Usuarios aplicativo" description="Accesos móviles y tipos de registro permitidos">
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Usuarios" value={counts.total} />
        <SummaryCard label="Activos" value={counts.activos} />
        <SummaryCard label="Con múltiples tipos" value={counts.multiples} />
      </div>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-950">Importador masivo</h2>
              <p className="text-sm font-medium text-slate-500">Carga usuarios del aplicativo y sus tipos de registro permitidos desde Excel.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={downloadTemplate}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Descargar plantilla
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-800">
              <Upload className="h-4 w-4" aria-hidden="true" />
              {importFileName ?? 'Seleccionar .xlsx'}
              <input
                className="hidden"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <Button type="button" disabled={!importRows.length || bulkImport.isPending} onClick={() => bulkImport.mutate()}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Importar
            </Button>
          </div>
        </div>
        <div className="mt-3 text-sm font-semibold text-slate-500">
          {importRows.length > 0 ? `${importRows.length} filas listas para importar.` : 'En tipos_registro puedes usar varios valores separados por |.'}
        </div>
        {importError ? <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{importError}</div> : null}
        {importSummary ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Creados: {importSummary.usuarios_creados} · Actualizados: {importSummary.usuarios_actualizados}
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              className={`${inputClass} w-full pl-9`}
              placeholder="Buscar usuario, DNI o nombre..."
              value={filters.q ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value, page: 1 }))}
            />
          </div>
          <select className={inputClass} value={filters.status ?? ''} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}>
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
          <Button onClick={openNew}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Nuevo acceso
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[880px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-100 px-5 py-4">Usuario</th>
                <th className="border-b border-slate-100 px-5 py-4">Personal</th>
                <th className="border-b border-slate-100 px-5 py-4">Tipos permitidos</th>
                <th className="border-b border-slate-100 px-5 py-4">Estado</th>
                <th className="border-b border-slate-100 px-5 py-4">Último login</th>
                <th className="border-b border-slate-100 px-5 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(usuarios.data?.data ?? []).map((user) => (
                <tr key={user.id} className="hover:bg-emerald-50/30">
                  <td className="px-5 py-4">
                    <div className="font-black text-slate-950">{user.nombre}</div>
                    <div className="text-xs font-semibold text-slate-500">@{user.usuario}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {user.personal ? `${user.personal.dni} - ${user.personal.nombres} ${user.personal.apellidos}` : '-'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {(user.tipos_vehiculo ?? []).map((tipo) => (
                        <span key={tipo.id} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800">
                          {tipo.nombre}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge value={user.estado} /></td>
                  <td className="px-5 py-4 text-slate-600">{user.ultimo_login_at?.replace('T', ' ').slice(0, 19) ?? '-'}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-1 text-slate-700 transition hover:text-emerald-800"
                        onClick={() => openEdit(user)}
                        title="Editar acceso"
                        aria-label={`Editar acceso ${user.usuario}`}
                      >
                        <Pencil className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="p-1 text-rose-600 transition hover:text-rose-800"
                        onClick={() => {
                          remove.reset()
                          setDeleteTarget(user)
                        }}
                        title="Eliminar acceso"
                        aria-label={`Eliminar acceso ${user.usuario}`}
                      >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!usuarios.isLoading && !usuarios.data?.data.length ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                    No hay usuarios de aplicativo con esos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <AppUsersPaginationBar
          currentPage={usuarios.data?.meta.current_page ?? 1}
          lastPage={usuarios.data?.meta.last_page ?? 1}
          perPage={usuarios.data?.meta.per_page ?? 50}
          total={usuarios.data?.meta.total ?? 0}
          showing={usuarios.data?.data.length ?? 0}
          onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
        />
      </section>

      {modalOpen ? (
        <UsuarioAplicativoModal
          editing={editing}
          form={form}
          personal={personal.data ?? []}
          tiposVehiculo={tiposVehiculo.data ?? []}
          loading={save.isPending}
          error={save.error ? apiErrorMessage(save.error, 'No se pudo guardar el usuario del aplicativo.') : null}
          onChange={setForm}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
          onSubmit={() => save.mutate()}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteUsuarioAplicativoModal
          user={deleteTarget}
          loading={remove.isPending}
          error={remove.error ? apiErrorMessage(remove.error, 'No se pudo eliminar el usuario del aplicativo.') : null}
          onCancel={() => {
            remove.reset()
            setDeleteTarget(null)
          }}
          onConfirm={() => remove.mutate()}
        />
      ) : null}
    </AppLayout>
  )
}

function AppUsersPaginationBar({
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
        Mostrando {start}-{end} de {total} usuarios aplicativo
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

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-800">
        <Smartphone className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <div className="text-2xl font-black text-slate-950">{value}</div>
        <div className="text-xs font-bold uppercase text-slate-500">{label}</div>
      </div>
    </div>
  )
}

function UsuarioAplicativoModal({
  editing,
  form,
  personal,
  tiposVehiculo,
  loading,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  editing: UsuarioAplicativo | null
  form: UsuarioAplicativoPayload
  personal: PersonalMaster[]
  tiposVehiculo: Array<{ id: number; nombre: string }>
  loading: boolean
  error: string | null
  onChange: Dispatch<SetStateAction<UsuarioAplicativoPayload>>
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">{editing ? 'Editar usuario aplicativo' : 'Nuevo usuario aplicativo'}</h2>
            <p className="text-sm font-medium text-slate-500">Define credenciales y tipos de registro disponibles en el APK.</p>
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
          <FilterField label="Personal vinculado">
            <select
              className={inputClass}
              value={form.personal_id ?? ''}
              onChange={(event) => {
                const selected = personal.find((item) => item.id === Number(event.target.value))
                onChange((current) => ({
                  ...current,
                  personal_id: event.target.value ? Number(event.target.value) : null,
                  nombre: selected ? `${selected.nombres} ${selected.apellidos}` : current.nombre,
                  usuario: selected ? selected.dni : current.usuario,
                  password: selected && !editing ? selected.dni : current.password,
                }))
              }}
            >
              <option value="">Sin vincular</option>
              {personal.map((item) => (
                <option key={item.id} value={item.id}>{item.dni} - {item.nombres} {item.apellidos}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Nombre visible">
            <input required className={inputClass} value={form.nombre} onChange={(event) => onChange((current) => ({ ...current, nombre: event.target.value }))} />
          </FilterField>
          <FilterField label="Usuario">
            <input required className={inputClass} value={form.usuario} onChange={(event) => onChange((current) => ({ ...current, usuario: event.target.value }))} />
          </FilterField>
          <FilterField label="Contraseña">
            <input
              required={!editing}
              className={inputClass}
              type="password"
              value={form.password ?? ''}
              onChange={(event) => onChange((current) => ({ ...current, password: event.target.value }))}
              placeholder={editing ? 'Dejar vacío para conservar' : 'Inicialmente puede ser el DNI'}
            />
          </FilterField>
          <FilterField label="Estado">
            <select className={inputClass} value={form.estado} onChange={(event) => onChange((current) => ({ ...current, estado: event.target.value as UsuarioAplicativoPayload['estado'] }))}>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </FilterField>
          <div className="md:col-span-2">
            <div className="mb-2 text-xs font-black uppercase text-slate-500">Tipos de registro permitidos</div>
            <div className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-2">
              {tiposVehiculo.map((tipo) => (
                <label key={tipo.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800">
                  <input
                    className="h-4 w-4 accent-emerald-700"
                    type="checkbox"
                    checked={form.tipo_vehiculo_ids.includes(tipo.id)}
                    onChange={(event) => {
                      onChange((current) => ({
                        ...current,
                        tipo_vehiculo_ids: event.target.checked
                          ? [...current.tipo_vehiculo_ids, tipo.id]
                          : current.tipo_vehiculo_ids.filter((id) => id !== tipo.id),
                      }))
                    }}
                  />
                  {tipo.nombre}
                </label>
              ))}
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 md:col-span-2">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 md:col-span-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Guardar
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

function DeleteUsuarioAplicativoModal({
  user,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  user: UsuarioAplicativo
  loading: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">Eliminar usuario aplicativo</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Se eliminará el acceso móvil de {user.nombre}. Esta acción no elimina el personal vinculado.
          </p>
        </div>

        {error ? (
          <div className="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 px-5 py-4">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>Cancelar</Button>
          <Button type="button" className="bg-rose-600 hover:bg-rose-700" onClick={onConfirm} disabled={loading}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Eliminar
          </Button>
        </div>
      </section>
    </div>
  )
}
