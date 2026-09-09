import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Download, FileUp, LoaderCircle, RefreshCw, ShieldAlert, Smartphone, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '../components/ui/button'
import {
  createAppVersion,
  getAppVersions,
  getCurrentAppVersion,
  type AppVersionPayload,
} from '../features/configuracion/appVersionService'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import { AppLayout } from '../layouts/AppLayout'
import { notifyProcess } from '../utils/processNotifications'

function emptyForm(): AppVersionPayload {
  return {
    version_code: '',
    version_name: '',
    message: '',
    required: false,
    apk: null,
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

function formatFileSize(value?: number | null) {
  if (!value) {
    return '-'
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Lima',
  }).format(new Date(value))
}

export function AppVersionPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<AppVersionPayload>(() => emptyForm())
  const [localError, setLocalError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const uploadProcessId = useRef<string | null>(null)

  const current = useQuery({ queryKey: ['app-version-current'], queryFn: getCurrentAppVersion })
  const versions = useQuery({ queryKey: ['app-versiones', page], queryFn: () => getAppVersions(page) })
  const createMutation = useMutation({
    mutationFn: (payload: AppVersionPayload) => createAppVersion(payload, (event) => {
      const total = event.total ?? payload.apk?.size ?? 0

      if (!total) {
        return
      }

      const progress = Math.min(99, Math.round((event.loaded * 100) / total))
      setUploadProgress(progress)
      notifyProcess({
        id: uploadProcessId.current ?? 'apk-upload',
        title: 'Publicacion APK',
        message: `Subiendo ${payload.apk?.name ?? 'archivo APK'}`,
        status: 'running',
        progress,
      })
    }),
    onSuccess: async (version) => {
      notifyProcess({
        id: uploadProcessId.current ?? 'apk-upload',
        title: 'Publicacion APK',
        message: `Version ${version.version_name} publicada correctamente.`,
        status: 'success',
        progress: 100,
      })
      setUploadProgress(null)
      uploadProcessId.current = null
      setForm(emptyForm())
      setLocalError(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['app-version-current'] }),
        queryClient.invalidateQueries({ queryKey: ['app-versiones'] }),
      ])
    },
    onError: (error) => {
      notifyProcess({
        id: uploadProcessId.current ?? 'apk-upload',
        title: 'Publicacion APK',
        message: apiErrorMessage(error, 'No se pudo publicar la version.'),
        status: 'error',
        progress: uploadProgress ?? undefined,
      })
      setUploadProgress(null)
      uploadProcessId.current = null
    },
  })

  const error = localError ?? (createMutation.error ? apiErrorMessage(createMutation.error, 'No se pudo publicar la versión.') : null)
  const latest = current.data

  return (
    <AppLayout title="Configuración · Versión APK" description="Publica actualizaciones del aplicativo Android AgroControl">
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black text-slate-950">Versión vigente</h2>
              <p className="text-sm font-medium text-slate-500">La app compara su `versionCode` contra esta publicación.</p>
            </div>
            <Button variant="ghost" className="h-9 w-9 p-0" onClick={() => void current.refetch()} disabled={current.isFetching} aria-label="Actualizar versión vigente">
              <RefreshCw className={`h-4 w-4 ${current.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
            </Button>
          </div>

          {latest ? (
            <div className="mt-5 grid gap-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-emerald-800">Version code {latest.version_code}</div>
                    <div className="text-2xl font-black text-slate-950">{latest.version_name}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${latest.required ? 'bg-red-100 text-red-700' : 'bg-white text-emerald-800'}`}>
                    {latest.required ? 'Obligatoria' : 'Opcional'}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-600">{latest.message || 'Sin mensaje publicado.'}</p>
              </div>
              <dl className="grid gap-2 text-sm">
                <InfoRow label="Publicado" value={formatDateTime(latest.published_at)} />
                <InfoRow label="Archivo" value={latest.original_filename ?? latest.apk_path} />
                <InfoRow label="Tamaño" value={formatFileSize(latest.file_size)} />
                <InfoRow label="Object storage" value={latest.apk_path} />
              </dl>
              {latest.download_url ? (
                <a className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0e5631] px-4 text-sm font-bold text-white hover:bg-[#0b4729]" href={latest.download_url} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Descargar APK vigente
                </a>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              Todavía no hay una versión publicada.
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <UploadCloud className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">Publicar nueva versión</h2>
              <p className="text-sm font-medium text-slate-500">Sube el APK y define si la actualización será obligatoria.</p>
            </div>
          </div>

          <form
            className="mt-5 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()

              if (!form.apk) {
                setLocalError('Selecciona un archivo APK.')
                return
              }

              if (!form.apk.name.toLowerCase().endsWith('.apk')) {
                setLocalError('El archivo debe tener extensión .apk.')
                return
              }

              setLocalError(null)
              setUploadProgress(0)
              uploadProcessId.current = `apk-upload-${Date.now()}`
              notifyProcess({
                id: uploadProcessId.current,
                title: 'Publicacion APK',
                message: `Preparando carga de ${form.apk.name}`,
                status: 'running',
                progress: 0,
              })
              createMutation.mutate(form)
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <FilterField label="Version code">
                <input className={inputClass} type="number" min={1} value={form.version_code} onChange={(event) => setForm((current) => ({ ...current, version_code: event.target.value }))} placeholder="Ej. 2" required />
              </FilterField>
              <FilterField label="Version name">
                <input className={inputClass} value={form.version_name} onChange={(event) => setForm((current) => ({ ...current, version_name: event.target.value }))} placeholder="Ej. 1.0.1" required />
              </FilterField>
            </div>
            <FilterField label="Mensaje para el usuario">
              <textarea
                className={`${inputClass} h-28 resize-none py-3`}
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                placeholder="Ej. Nueva versión con mejoras de sincronización."
              />
            </FilterField>
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={form.required} onChange={(event) => setForm((current) => ({ ...current, required: event.target.checked }))} />
              Actualización obligatoria
            </label>
            <label className="grid cursor-pointer place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center hover:bg-slate-100">
              <FileUp className="h-8 w-8 text-emerald-700" aria-hidden="true" />
              <span className="mt-2 text-sm font-black text-slate-900">{form.apk?.name ?? 'Seleccionar archivo .apk'}</span>
              <span className="mt-1 text-xs font-semibold text-slate-500">Máximo 200 MB. Se almacenará en object storage.</span>
              <input
                className="sr-only"
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                onChange={(event) => setForm((current) => ({ ...current, apk: event.target.files?.[0] ?? null }))}
              />
            </label>
            {createMutation.isPending ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <div className="flex items-center justify-between gap-3 text-sm font-black text-emerald-900">
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Publicando APK
                  </span>
                  <span>{uploadProgress ?? 0}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-[#0e5631] transition-all" style={{ width: `${uploadProgress ?? 0}%` }} />
                </div>
              </div>
            ) : null}
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
              El version code publicado debe coincidir con el versionCode interno del APK. Si no coincide, la app seguira detectando actualizacion despues de instalar.
            </div>
            {error ? (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                {error}
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setForm(emptyForm()); setLocalError(null) }} disabled={createMutation.isPending}>Limpiar</Button>
              <Button type="submit" className="bg-[#0e5631] text-white hover:bg-[#0b4729]" disabled={createMutation.isPending}>
                <UploadCloud className="h-4 w-4 text-white" aria-hidden="true" />
                Publicar APK
              </Button>
            </div>
          </form>
        </section>
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-base font-black text-slate-950">Historial de versiones</h2>
            <p className="text-sm font-medium text-slate-500">Todas las publicaciones realizadas.</p>
          </div>
          <Button variant="secondary" onClick={() => void versions.refetch()} disabled={versions.isFetching}>
            <RefreshCw className={`h-4 w-4 ${versions.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
            Actualizar
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3">Versión</th>
                <th className="border-b border-slate-200 px-4 py-3">Mensaje</th>
                <th className="border-b border-slate-200 px-4 py-3">Archivo</th>
                <th className="border-b border-slate-200 px-4 py-3">Publicación</th>
                <th className="border-b border-slate-200 px-4 py-3">Descarga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(versions.data?.data ?? []).map((version) => (
                <tr key={version.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 align-top">
                    <div className="font-black text-slate-950">{version.version_name}</div>
                    <div className="text-xs font-semibold text-slate-500">Code {version.version_code}</div>
                    <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-black ${version.required ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {version.required ? 'Obligatoria' : 'Opcional'}
                    </div>
                  </td>
                  <td className="max-w-md px-4 py-3 align-top text-slate-700">{version.message || '-'}</td>
                  <td className="px-4 py-3 align-top text-slate-700">
                    <div className="font-semibold">{version.original_filename ?? '-'}</div>
                    <div className="text-xs text-slate-500">{formatFileSize(version.file_size)}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-slate-700">
                    <div>{formatDateTime(version.published_at)}</div>
                    <div className="text-xs text-slate-500">{version.creator?.name ?? 'Sistema'}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {version.download_url ? (
                      <a className="inline-flex items-center gap-2 font-black text-emerald-700 hover:text-emerald-900" href={version.download_url} target="_blank" rel="noreferrer">
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Descargar
                      </a>
                    ) : '-'}
                  </td>
                </tr>
              ))}
              {!versions.isLoading && !versions.data?.data.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">No hay versiones publicadas.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-500">
          <span>Mostrando {versions.data?.data.length ?? 0} de {versions.data?.meta.total ?? 0} versiones</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={(versions.data?.meta.current_page ?? 1) <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button>
            <span className="rounded-md bg-emerald-700 px-3 py-2 font-black text-white">{versions.data?.meta.current_page ?? 1}</span>
            <Button variant="secondary" disabled={(versions.data?.meta.current_page ?? 1) >= (versions.data?.meta.last_page ?? 1)} onClick={() => setPage((current) => current + 1)}>Siguiente</Button>
          </div>
        </div>
      </section>
    </AppLayout>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs font-black uppercase text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words font-semibold text-slate-800">{value}</dd>
    </div>
  )
}
