import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Settings2, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import {
  createHorometroConfiguracionTipo,
  getHorometroConfiguraciones,
  updateHorometroConfiguracionTipo,
} from '../features/horometros/horometrosService'
import type { HorometroConfiguracion, HorometroConfiguracionPorTipo } from '../features/horometros/types'
import { getTiposPersonalMaster } from '../features/maestros/maestrosService'
import type { TipoPersonal } from '../features/maestros/types'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import { AppLayout } from '../layouts/AppLayout'

type FormState = Omit<HorometroConfiguracion, 'id' | 'tipo_vehiculo_id'>
type NewTipoForm = {
  nombre: string
  icono: File | null
  iconPreview: string | null
}

const defaultRequiredFields = {
  sede: true,
  operario: true,
  foto: true,
}

function normalizeConfig(config: HorometroConfiguracion): FormState {
  return {
    hora_inicio_desde: config.hora_inicio_desde.slice(0, 5),
    hora_inicio_hasta: config.hora_inicio_hasta.slice(0, 5),
    hora_cierre_hasta: config.hora_cierre_hasta.slice(0, 5),
    tolerancia_inicio_horas: config.tolerancia_inicio_horas,
    tolerancia_maxima_horas_dia: config.tolerancia_maxima_horas_dia,
    permite_correccion_manual: config.permite_correccion_manual,
    foto_obligatoria: config.foto_obligatoria,
    vigencia_reapertura_minutos: config.vigencia_reapertura_minutos,
    ocr_activo: config.ocr_activo,
    campos_requeridos: {
      ...defaultRequiredFields,
      ...(config.campos_requeridos ?? {}),
    },
    parametros_adicionales: config.parametros_adicionales ?? {},
  }
}

export function HorometrosConfiguracionPage() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTipo, setNewTipo] = useState<NewTipoForm>({ nombre: '', icono: null, iconPreview: null })
  const [createError, setCreateError] = useState<string | null>(null)
  const configuraciones = useQuery({
    queryKey: ['horometros-configuraciones'],
    queryFn: getHorometroConfiguraciones,
  })
  const tiposPersonal = useQuery({
    queryKey: ['horometros-configuracion-tipos-personal'],
    queryFn: getTiposPersonalMaster,
  })
  const [forms, setForms] = useState<Record<number, FormState>>({})
  const update = useMutation({
    mutationFn: ({ tipoVehiculoId, payload }: { tipoVehiculoId: number; payload: FormState }) => updateHorometroConfiguracionTipo(tipoVehiculoId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['horometros-configuraciones'] })
      await queryClient.invalidateQueries({ queryKey: ['horometros-configuracion'] })
    },
  })
  const createTipo = useMutation({
    mutationFn: createHorometroConfiguracionTipo,
    onSuccess: async () => {
      setShowCreateModal(false)
      setCreateError(null)
      setNewTipo({ nombre: '', icono: null, iconPreview: null })
      await queryClient.invalidateQueries({ queryKey: ['horometros-configuraciones'] })
      await queryClient.invalidateQueries({ queryKey: ['tipos-vehiculo'] })
    },
    onError: (error: Error) => {
      setCreateError(error.message || 'No se pudo crear el tipo de registro.')
    },
  })

  useEffect(() => {
    if (!configuraciones.data) {
      return
    }

    setForms(Object.fromEntries(configuraciones.data.map((item) => [
      item.tipo_vehiculo.id,
      normalizeConfig(item.configuracion),
    ])))
  }, [configuraciones.data])

  const patch = <K extends keyof FormState>(tipoVehiculoId: number, key: K, value: FormState[K]) => {
    setForms((current) => ({
      ...current,
      [tipoVehiculoId]: {
        ...current[tipoVehiculoId],
        [key]: value,
      },
    }))
  }

  const patchRequiredField = (tipoVehiculoId: number, key: keyof NonNullable<FormState['campos_requeridos']>, value: boolean) => {
    setForms((current) => ({
      ...current,
      [tipoVehiculoId]: {
        ...current[tipoVehiculoId],
        campos_requeridos: {
          ...defaultRequiredFields,
          ...(current[tipoVehiculoId]?.campos_requeridos ?? {}),
          [key]: value,
        },
      },
    }))
  }

  const patchPersonalType = (tipoVehiculoId: number, codigo: string, checked: boolean) => {
    setForms((current) => ({
      ...current,
      [tipoVehiculoId]: {
        ...current[tipoVehiculoId],
        parametros_adicionales: {
          ...(current[tipoVehiculoId]?.parametros_adicionales ?? {}),
          personal_tipos: checked
            ? Array.from(new Set([...(current[tipoVehiculoId]?.parametros_adicionales?.personal_tipos ?? []), codigo]))
            : (current[tipoVehiculoId]?.parametros_adicionales?.personal_tipos ?? []).filter((item) => item !== codigo),
        },
      },
    }))
  }

  const handleIconFile = async (file?: File) => {
    setCreateError(null)

    if (!file) {
      setNewTipo((current) => ({ ...current, icono: null, iconPreview: null }))
      return
    }

    if (file.type !== 'image/png') {
      setCreateError('El icono debe ser un archivo PNG.')
      return
    }

    const imageUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      if (image.width > 50 || image.height > 50) {
        URL.revokeObjectURL(imageUrl)
        setCreateError('El icono no debe superar 50x50 px.')
        return
      }

      setNewTipo((current) => ({ ...current, icono: file, iconPreview: imageUrl }))
    }
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl)
      setCreateError('No se pudo leer el icono seleccionado.')
    }
    image.src = imageUrl
  }

  const submitNewTipo = () => {
    if (!newTipo.nombre.trim()) {
      setCreateError('Ingresa el nombre del tipo de registro.')
      return
    }

    if (!newTipo.icono) {
      setCreateError('Adjunta un icono PNG de hasta 50x50 px.')
      return
    }

    createTipo.mutate({ nombre: newTipo.nombre.trim(), icono: newTipo.icono })
  }

  return (
    <AppLayout title="Horómetros · Configuración" description="Parámetros por tipo de registro para web y aplicativo">
      <div className="grid gap-5">
        <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">Tipos de registro</h2>
            <p className="text-sm font-semibold text-slate-500">Crea nuevos flujos como Motos, Camionetas u otros equipos con su icono para el aplicativo.</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo tipo
          </Button>
        </section>

        {(configuraciones.data ?? []).map((item) => (
          <TipoRegistroConfigCard
            key={item.tipo_vehiculo.id}
            item={item}
            form={forms[item.tipo_vehiculo.id]}
            tiposPersonal={tiposPersonal.data ?? []}
            saving={update.isPending}
            onPatch={patch}
            onPatchRequired={patchRequiredField}
            onPatchPersonalType={patchPersonalType}
            onSave={() => {
              const payload = forms[item.tipo_vehiculo.id]
              if (payload) {
                update.mutate({ tipoVehiculoId: item.tipo_vehiculo.id, payload })
              }
            }}
          />
        ))}

        {!configuraciones.isLoading && !configuraciones.data?.length ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
            Crea tipos de vehículo activos para configurar sus reglas de horómetro.
          </section>
        ) : null}
      </div>

      {showCreateModal ? (
        <NewTipoRegistroModal
          form={newTipo}
          error={createError}
          saving={createTipo.isPending}
          onChangeName={(value) => setNewTipo((current) => ({ ...current, nombre: value }))}
          onChangeIcon={handleIconFile}
          onClose={() => {
            setShowCreateModal(false)
            setCreateError(null)
          }}
          onSubmit={submitNewTipo}
        />
      ) : null}
    </AppLayout>
  )
}

function TipoRegistroConfigCard({
  item,
  form,
  tiposPersonal,
  saving,
  onPatch,
  onPatchRequired,
  onPatchPersonalType,
  onSave,
}: {
  item: HorometroConfiguracionPorTipo
  form?: FormState
  tiposPersonal: TipoPersonal[]
  saving: boolean
  onPatch: <K extends keyof FormState>(tipoVehiculoId: number, key: K, value: FormState[K]) => void
  onPatchRequired: (tipoVehiculoId: number, key: keyof NonNullable<FormState['campos_requeridos']>, value: boolean) => void
  onPatchPersonalType: (tipoVehiculoId: number, codigo: string, checked: boolean) => void
  onSave: () => void
}) {
  if (!form) {
    return null
  }

  const tipoId = item.tipo_vehiculo.id
  const required = {
    ...defaultRequiredFields,
    ...(form.campos_requeridos ?? {}),
  }
  const personalTypes = form.parametros_adicionales?.personal_tipos ?? []

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
          {item.tipo_vehiculo.icono_url ? (
            <img src={item.tipo_vehiculo.icono_url} alt="" className="h-7 w-7 object-contain" />
          ) : (
            <Settings2 className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <div>
          <h2 className="text-base font-black text-slate-950">{item.tipo_vehiculo.nombre}</h2>
          <p className="text-sm font-medium text-slate-500">Reglas específicas para este tipo de registro.</p>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-2">
        <div className="grid gap-4 rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-black uppercase text-slate-500">Horarios</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <FilterField label="Inicio desde">
              <input className={inputClass} type="time" value={form.hora_inicio_desde} onChange={(event) => onPatch(tipoId, 'hora_inicio_desde', event.target.value)} />
            </FilterField>
            <FilterField label="Inicio hasta">
              <input className={inputClass} type="time" value={form.hora_inicio_hasta} onChange={(event) => onPatch(tipoId, 'hora_inicio_hasta', event.target.value)} />
            </FilterField>
            <FilterField label="Cierre máximo">
              <input className={inputClass} type="time" value={form.hora_cierre_hasta} onChange={(event) => onPatch(tipoId, 'hora_cierre_hasta', event.target.value)} />
            </FilterField>
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-black uppercase text-slate-500">Tolerancias</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <FilterField label="Diferencia inicio">
              <input className={inputClass} type="number" min={0} step="0.01" value={form.tolerancia_inicio_horas} onChange={(event) => onPatch(tipoId, 'tolerancia_inicio_horas', event.target.value)} />
            </FilterField>
            <FilterField label="Máx. horas día">
              <input className={inputClass} type="number" min={0} step="0.01" value={form.tolerancia_maxima_horas_dia} onChange={(event) => onPatch(tipoId, 'tolerancia_maxima_horas_dia', event.target.value)} />
            </FilterField>
            <FilterField label="Vigencia reapertura">
              <input className={inputClass} type="number" min={15} max={1440} value={form.vigencia_reapertura_minutos} onChange={(event) => onPatch(tipoId, 'vigencia_reapertura_minutos', Number(event.target.value))} />
            </FilterField>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-black uppercase text-slate-500">Reglas de captura</h3>
          <div className="grid gap-3">
            <Toggle label="OCR activo" checked={form.ocr_activo} onChange={(value) => onPatch(tipoId, 'ocr_activo', value)} />
            <Toggle label="Permitir corrección manual" checked={form.permite_correccion_manual} onChange={(value) => onPatch(tipoId, 'permite_correccion_manual', value)} />
            <Toggle label="Foto obligatoria" checked={form.foto_obligatoria} onChange={(value) => onPatch(tipoId, 'foto_obligatoria', value)} />
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-black uppercase text-slate-500">Campos requeridos</h3>
          <div className="grid gap-3">
            <Toggle label="Sede" checked={Boolean(required.sede)} onChange={(value) => onPatchRequired(tipoId, 'sede', value)} />
            <Toggle label="Operario / conductor" checked={Boolean(required.operario)} onChange={(value) => onPatchRequired(tipoId, 'operario', value)} />
            <Toggle label="Foto como evidencia" checked={Boolean(required.foto)} onChange={(value) => onPatchRequired(tipoId, 'foto', value)} />
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 p-4 xl:col-span-2">
          <h3 className="text-sm font-black uppercase text-slate-500">Personal permitido en el aplicativo</h3>
          <div className="grid gap-2 md:grid-cols-3">
            {tiposPersonal.map((tipo) => {
              const codigo = tipo.codigo ?? tipo.nombre ?? ''

              if (!codigo) {
                return null
              }

              return (
                <label key={tipo.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800">
                  <input
                    className="h-4 w-4 accent-emerald-700"
                    type="checkbox"
                    checked={personalTypes.includes(codigo)}
                    onChange={(event) => onPatchPersonalType(tipoId, codigo, event.target.checked)}
                  />
                  <span>{codigo}</span>
                </label>
              )
            })}
          </div>
          {!tiposPersonal.length ? (
            <p className="text-xs font-semibold text-slate-500">No hay tipos de personal activos para seleccionar.</p>
          ) : null}
          <p className="text-xs font-semibold text-slate-500">
            Si se deja vacío, el aplicativo mostrará el personal activo disponible para ese usuario.
          </p>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-100 px-5 py-4">
        <Button disabled={saving} onClick={onSave}>
          <Save className="h-4 w-4" aria-hidden="true" />
          Guardar {item.tipo_vehiculo.nombre}
        </Button>
      </div>
    </section>
  )
}

function NewTipoRegistroModal({
  form,
  error,
  saving,
  onChangeName,
  onChangeIcon,
  onClose,
  onSubmit,
}: {
  form: NewTipoForm
  error: string | null
  saving: boolean
  onChangeName: (value: string) => void
  onChangeIcon: (file?: File) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4">
      <section className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-black text-slate-950">Nuevo tipo de registro</h2>
            <p className="text-sm font-semibold text-slate-500">El icono se sincronizará con el aplicativo.</p>
          </div>
          <button type="button" className="text-slate-500 hover:text-slate-900" onClick={onClose} aria-label="Cerrar">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 p-5">
          <FilterField label="Nombre">
            <input className={inputClass} value={form.nombre} onChange={(event) => onChangeName(event.target.value)} placeholder="Ejemplo: Motos" />
          </FilterField>

          <div className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Icono PNG</span>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-700 transition hover:border-emerald-600 hover:bg-emerald-50">
              <span className="inline-flex items-center gap-2">
                <Upload className="h-4 w-4" aria-hidden="true" />
                Seleccionar icono
              </span>
              <span className="text-xs font-semibold text-slate-500">PNG máximo 50x50 px</span>
              <input className="hidden" type="file" accept="image/png" onChange={(event) => onChangeIcon(event.target.files?.[0])} />
            </label>
            {form.iconPreview ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
                <img className="h-[50px] w-[50px] object-contain" src={form.iconPreview} alt="Vista previa del icono" />
                Icono listo para sincronizar.
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Crear tipo
          </Button>
        </div>
      </section>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">
      <span>{label}</span>
      <input className="h-5 w-5 accent-emerald-700" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}
