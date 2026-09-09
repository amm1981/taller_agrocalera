import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clock3, ImageIcon, Info, Plus, Save, Settings2, SlidersHorizontal, Upload, Users, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import {
  createHorometroConfiguracionTipo,
  getHorometroConfiguraciones,
  updateHorometroConfiguracionTipo,
  updateHorometroTipoRegistro,
} from '../features/horometros/horometrosService'
import type { HorometroConfiguracion, HorometroConfiguracionPorTipo } from '../features/horometros/types'
import { getTiposPersonalMaster } from '../features/maestros/maestrosService'
import type { TipoPersonal } from '../features/maestros/types'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import { AppLayout } from '../layouts/AppLayout'
import { cn } from '../utils/cn'

type FormState = Omit<HorometroConfiguracion, 'id' | 'tipo_vehiculo_id'>
type NewTipoForm = {
  nombre: string
  icono: File | null
  iconPreview: string | null
}
type TipoForm = {
  nombre: string
  estado: string
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

function serializeForm(form?: FormState) {
  return JSON.stringify(form ?? null)
}

export function HorometrosConfiguracionPage() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTipoId, setSelectedTipoId] = useState<number | null>(null)
  const [newTipo, setNewTipo] = useState<NewTipoForm>({ nombre: '', icono: null, iconPreview: null })
  const [createError, setCreateError] = useState<string | null>(null)
  const [tipoForms, setTipoForms] = useState<Record<number, TipoForm>>({})
  const [tipoErrors, setTipoErrors] = useState<Record<number, string | null>>({})
  const [forms, setForms] = useState<Record<number, FormState>>({})
  const configuraciones = useQuery({
    queryKey: ['horometros-configuraciones'],
    queryFn: getHorometroConfiguraciones,
  })
  const tiposPersonal = useQuery({
    queryKey: ['horometros-configuracion-tipos-personal'],
    queryFn: getTiposPersonalMaster,
  })

  const update = useMutation({
    mutationFn: ({ tipoVehiculoId, payload }: { tipoVehiculoId: number; payload: FormState }) => updateHorometroConfiguracionTipo(tipoVehiculoId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['horometros-configuraciones'] })
      await queryClient.invalidateQueries({ queryKey: ['horometros-configuracion'] })
    },
  })
  const createTipo = useMutation({
    mutationFn: createHorometroConfiguracionTipo,
    onSuccess: async (created) => {
      setSelectedTipoId(created.tipo_vehiculo.id)
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
  const updateTipo = useMutation({
    mutationFn: ({ tipoVehiculoId, payload }: { tipoVehiculoId: number; payload: { nombre: string; estado: string; icono?: File | null } }) => updateHorometroTipoRegistro(tipoVehiculoId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['horometros-configuraciones'] })
      await queryClient.invalidateQueries({ queryKey: ['tipos-vehiculo'] })
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
    setTipoForms(Object.fromEntries(configuraciones.data.map((item) => [
      item.tipo_vehiculo.id,
      {
        nombre: item.tipo_vehiculo.nombre,
        estado: item.tipo_vehiculo.estado,
        icono: null,
        iconPreview: null,
      },
    ])))

    setSelectedTipoId((current) => {
      if (current && configuraciones.data.some((item) => item.tipo_vehiculo.id === current)) {
        return current
      }

      return configuraciones.data[0]?.tipo_vehiculo.id ?? null
    })
  }, [configuraciones.data])

  const selectedItem = useMemo(
    () => (configuraciones.data ?? []).find((item) => item.tipo_vehiculo.id === selectedTipoId) ?? null,
    [configuraciones.data, selectedTipoId],
  )
  const selectedForm = selectedItem ? forms[selectedItem.tipo_vehiculo.id] : undefined
  const selectedTipoForm = selectedItem ? tipoForms[selectedItem.tipo_vehiculo.id] : undefined
  const originalForm = selectedItem ? normalizeConfig(selectedItem.configuracion) : undefined
  const isConfigDirty = selectedForm ? serializeForm(selectedForm) !== serializeForm(originalForm) : false
  const isTipoDirty = Boolean(
    selectedItem
    && selectedTipoForm
    && (
      selectedTipoForm.nombre.trim() !== selectedItem.tipo_vehiculo.nombre
      || selectedTipoForm.estado !== selectedItem.tipo_vehiculo.estado
      || selectedTipoForm.icono
    ),
  )
  const hasChanges = isConfigDirty || isTipoDirty
  const saving = update.isPending || updateTipo.isPending

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

  const validatePngIcon = (file: File | undefined, onValid: (file: File, preview: string) => void, onError: (message: string) => void) => {
    if (!file) {
      return
    }

    if (file.type !== 'image/png') {
      onError('El icono debe ser un archivo PNG.')
      return
    }

    const imageUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      if (image.width > 50 || image.height > 50) {
        URL.revokeObjectURL(imageUrl)
        onError('El icono no debe superar 50x50 px.')
        return
      }

      onValid(file, imageUrl)
    }
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl)
      onError('No se pudo leer el icono seleccionado.')
    }
    image.src = imageUrl
  }

  const handleIconFile = (file?: File) => {
    setCreateError(null)

    if (!file) {
      setNewTipo((current) => ({ ...current, icono: null, iconPreview: null }))
      return
    }

    validatePngIcon(
      file,
      (validFile, preview) => setNewTipo((current) => ({ ...current, icono: validFile, iconPreview: preview })),
      setCreateError,
    )
  }

  const patchTipo = <K extends keyof TipoForm>(tipoVehiculoId: number, key: K, value: TipoForm[K]) => {
    setTipoForms((current) => ({
      ...current,
      [tipoVehiculoId]: {
        ...current[tipoVehiculoId],
        [key]: value,
      },
    }))
  }

  const handleTipoIconFile = (tipoVehiculoId: number, file?: File) => {
    setTipoErrors((current) => ({ ...current, [tipoVehiculoId]: null }))

    if (!file) {
      patchTipo(tipoVehiculoId, 'icono', null)
      patchTipo(tipoVehiculoId, 'iconPreview', null)
      return
    }

    validatePngIcon(
      file,
      (validFile, preview) => {
        patchTipo(tipoVehiculoId, 'icono', validFile)
        patchTipo(tipoVehiculoId, 'iconPreview', preview)
      },
      (message) => setTipoErrors((current) => ({ ...current, [tipoVehiculoId]: message })),
    )
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

  const resetSelectedChanges = () => {
    if (!selectedItem) {
      return
    }

    const tipoId = selectedItem.tipo_vehiculo.id
    setForms((current) => ({
      ...current,
      [tipoId]: normalizeConfig(selectedItem.configuracion),
    }))
    setTipoForms((current) => ({
      ...current,
      [tipoId]: {
        nombre: selectedItem.tipo_vehiculo.nombre,
        estado: selectedItem.tipo_vehiculo.estado,
        icono: null,
        iconPreview: null,
      },
    }))
    setTipoErrors((current) => ({ ...current, [tipoId]: null }))
  }

  const saveSelectedChanges = async () => {
    if (!selectedItem || !selectedForm || !selectedTipoForm) {
      return
    }

    const tipoId = selectedItem.tipo_vehiculo.id

    if (!selectedTipoForm.nombre.trim()) {
      setTipoErrors((current) => ({ ...current, [tipoId]: 'Ingresa el nombre del tipo de registro.' }))
      return
    }

    setTipoErrors((current) => ({ ...current, [tipoId]: null }))

    if (isTipoDirty) {
      await updateTipo.mutateAsync({
        tipoVehiculoId: tipoId,
        payload: {
          nombre: selectedTipoForm.nombre.trim(),
          estado: selectedTipoForm.estado,
          icono: selectedTipoForm.icono,
        },
      })
    }

    if (isConfigDirty) {
      await update.mutateAsync({ tipoVehiculoId: tipoId, payload: selectedForm })
    }
  }

  return (
    <AppLayout title="Horómetros · Configuración" description="Gestiona los parámetros por tipo de registro para el aplicativo.">
      <div className="grid gap-4 pb-24">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Tipos de registro</h2>
              <p className="text-sm font-semibold text-slate-500">Selecciona un tipo para configurar sus parámetros.</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="bg-[#0e5631] hover:bg-[#0b4728]">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuevo tipo
            </Button>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {(configuraciones.data ?? []).map((item) => (
              <TipoSelectorCard
                key={item.tipo_vehiculo.id}
                item={item}
                selected={item.tipo_vehiculo.id === selectedTipoId}
                preview={tipoForms[item.tipo_vehiculo.id]?.iconPreview}
                onSelect={() => setSelectedTipoId(item.tipo_vehiculo.id)}
              />
            ))}
          </div>

          {!configuraciones.isLoading && !configuraciones.data?.length ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
              Crea tipos de vehículo activos para configurar sus reglas de horómetro.
            </div>
          ) : null}
        </section>

        {selectedItem && selectedForm && selectedTipoForm ? (
          <TipoRegistroConfigPanel
            item={selectedItem}
            form={selectedForm}
            tipoForm={selectedTipoForm}
            tipoError={tipoErrors[selectedItem.tipo_vehiculo.id] ?? null}
            tiposPersonal={tiposPersonal.data ?? []}
            onPatchTipo={patchTipo}
            onPatchTipoIcon={handleTipoIconFile}
            onPatch={patch}
            onPatchRequired={patchRequiredField}
            onPatchPersonalType={patchPersonalType}
          />
        ) : null}
      </div>

      {selectedItem ? (
        <div className="sticky bottom-0 z-20 -mx-6 border-t border-slate-200 bg-white/95 px-6 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950">{hasChanges ? 'Hay cambios sin guardar' : 'Sin cambios pendientes'}</p>
                <p className="text-xs font-semibold text-slate-500">Revisa la información antes de continuar.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={!hasChanges || saving} onClick={resetSelectedChanges}>Cancelar</Button>
              <Button disabled={!hasChanges || saving} onClick={() => void saveSelectedChanges()} className="bg-[#0e5631] hover:bg-[#0b4728]">
                <Save className="h-4 w-4" aria-hidden="true" />
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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

function TipoSelectorCard({
  item,
  selected,
  preview,
  onSelect,
}: {
  item: HorometroConfiguracionPorTipo
  selected: boolean
  preview?: string | null
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex min-h-[96px] items-center justify-between gap-4 rounded-lg border bg-white p-4 text-left shadow-sm transition',
        selected ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600' : 'border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30',
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <IconPreview item={item} preview={preview} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black text-slate-950">{item.tipo_vehiculo.nombre}</h3>
            {item.tipo_vehiculo.estado !== 'ACTIVO' ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500">INACTIVO</span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">Reglas, horarios y perfiles permitidos para este flujo.</p>
        </div>
      </div>
      <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border', selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-transparent')}>
        <Check className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  )
}

function TipoRegistroConfigPanel({
  item,
  form,
  tipoForm,
  tipoError,
  tiposPersonal,
  onPatchTipo,
  onPatchTipoIcon,
  onPatch,
  onPatchRequired,
  onPatchPersonalType,
}: {
  item: HorometroConfiguracionPorTipo
  form: FormState
  tipoForm: TipoForm
  tipoError: string | null
  tiposPersonal: TipoPersonal[]
  onPatchTipo: <K extends keyof TipoForm>(tipoVehiculoId: number, key: K, value: TipoForm[K]) => void
  onPatchTipoIcon: (tipoVehiculoId: number, file?: File) => void
  onPatch: <K extends keyof FormState>(tipoVehiculoId: number, key: K, value: FormState[K]) => void
  onPatchRequired: (tipoVehiculoId: number, key: keyof NonNullable<FormState['campos_requeridos']>, value: boolean) => void
  onPatchPersonalType: (tipoVehiculoId: number, codigo: string, checked: boolean) => void
}) {
  const tipoId = item.tipo_vehiculo.id
  const required = {
    ...defaultRequiredFields,
    ...(form.campos_requeridos ?? {}),
  }
  const personalTypes = form.parametros_adicionales?.personal_tipos ?? []

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <IconPreview item={item} preview={tipoForm.iconPreview} size="md" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-slate-950">{item.tipo_vehiculo.nombre}</h2>
            <span className={cn('rounded-full px-3 py-1 text-xs font-black', item.tipo_vehiculo.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
              {item.tipo_vehiculo.estado}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-500">Configura las reglas y parámetros para este tipo de registro.</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ConfigSection icon={<Info className="h-5 w-5" />} title="Información general" description="Define el nombre, estado y el ícono que representa este tipo.">
          <div className="grid gap-4 md:grid-cols-[160px_1fr]">
            <div>
              <div className="grid h-28 w-full place-items-center rounded-lg border border-slate-200 bg-slate-50">
                <IconPreview item={item} preview={tipoForm.iconPreview} size="xl" />
              </div>
              <label className="mt-2 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                <Upload className="h-4 w-4" aria-hidden="true" />
                Cambiar ícono
                <input className="hidden" type="file" accept="image/png" onChange={(event) => onPatchTipoIcon(tipoId, event.target.files?.[0])} />
              </label>
            </div>
            <div className="grid gap-3">
              <FilterField label="Nombre del tipo de registro">
                <input className={inputClass} value={tipoForm.nombre} onChange={(event) => onPatchTipo(tipoId, 'nombre', event.target.value)} />
              </FilterField>
              <FilterField label="Estado">
                <select className={inputClass} value={tipoForm.estado} onChange={(event) => onPatchTipo(tipoId, 'estado', event.target.value)}>
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </FilterField>
              <p className="text-xs font-semibold text-slate-500">Si se desactiva, no estará disponible en el aplicativo. El ícono debe ser PNG y máximo 50x50 px.</p>
              {tipoError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{tipoError}</div>
              ) : null}
            </div>
          </div>
        </ConfigSection>

        <ConfigSection icon={<Clock3 className="h-5 w-5" />} title="Horarios" description="Define el rango de operación permitido.">
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
          <InfoBox>El cierre máximo permite registros extemporáneos dentro del mismo día.</InfoBox>
        </ConfigSection>

        <ConfigSection icon={<SlidersHorizontal className="h-5 w-5" />} title="Tolerancias" description="Configura márgenes y tiempos de validación.">
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
        </ConfigSection>

        <ConfigSection icon={<Settings2 className="h-5 w-5" />} title="Reglas de captura" description="Define cómo se capturan los registros en el aplicativo.">
          <div className="grid gap-2">
            <Toggle label="OCR activo" description="Lee automáticamente los datos de la imagen." checked={form.ocr_activo} onChange={(value) => onPatch(tipoId, 'ocr_activo', value)} />
            <Toggle label="Permitir corrección manual" description="Permite editar los datos extraídos." checked={form.permite_correccion_manual} onChange={(value) => onPatch(tipoId, 'permite_correccion_manual', value)} />
            <Toggle label="Foto obligatoria" description="El registro requiere una fotografía." checked={form.foto_obligatoria} onChange={(value) => onPatch(tipoId, 'foto_obligatoria', value)} />
          </div>
        </ConfigSection>

        <ConfigSection icon={<ImageIcon className="h-5 w-5" />} title="Campos requeridos" description="Selecciona qué campos son obligatorios en el formulario.">
          <div className="grid gap-2">
            <Toggle label="Sede" description="Debe seleccionarse una sede." checked={Boolean(required.sede)} onChange={(value) => onPatchRequired(tipoId, 'sede', value)} />
            <Toggle label="Operario / conductor" description="Debe asignarse un operario o conductor." checked={Boolean(required.operario)} onChange={(value) => onPatchRequired(tipoId, 'operario', value)} />
            <Toggle label="Foto como evidencia" description="La foto será obligatoria en el aplicativo." checked={Boolean(required.foto)} onChange={(value) => onPatchRequired(tipoId, 'foto', value)} />
          </div>
        </ConfigSection>

        <ConfigSection icon={<Users className="h-5 w-5" />} title="Personal permitido en el aplicativo" description="Selecciona los perfiles que pueden registrar horómetros de este tipo.">
          <div className="grid gap-2 md:grid-cols-3">
            {tiposPersonal.map((tipo) => {
              const codigo = tipo.codigo ?? tipo.nombre ?? ''

              if (!codigo) {
                return null
              }

              const checked = personalTypes.includes(codigo)

              return (
                <button
                  key={tipo.id}
                  type="button"
                  className={cn(
                    'flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-black transition',
                    checked ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200',
                  )}
                  onClick={() => onPatchPersonalType(tipoId, codigo, !checked)}
                >
                  {checked ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                  {codigo}
                </button>
              )
            })}
          </div>
          {!tiposPersonal.length ? (
            <p className="text-xs font-semibold text-slate-500">No hay tipos de personal activos para seleccionar.</p>
          ) : null}
          <InfoBox>Si no seleccionas ningún perfil, el tipo estará disponible para todo el personal activo.</InfoBox>
        </ConfigSection>
      </div>
    </section>
  )
}

function IconPreview({
  item,
  preview,
  size,
}: {
  item: HorometroConfiguracionPorTipo
  preview?: string | null
  size: 'md' | 'lg' | 'xl'
}) {
  const classes = {
    md: 'h-14 w-14',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20',
  }
  const imageClasses = {
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
    xl: 'h-12 w-12',
  }

  return (
    <div className={cn('grid shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700', classes[size])}>
      {preview ? (
        <img src={preview} alt="" className={cn('object-contain', imageClasses[size])} />
      ) : item.tipo_vehiculo.icono_url ? (
        <img src={item.tipo_vehiculo.icono_url} alt="" className={cn('object-contain', imageClasses[size])} />
      ) : (
        <Settings2 className="h-6 w-6" aria-hidden="true" />
      )}
    </div>
  )
}

function ConfigSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-50 text-slate-700">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          <p className="text-sm font-semibold text-slate-500">{description}</p>
        </div>
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  )
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-semibold text-slate-600">
      <Info className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
      <span>{children}</span>
    </div>
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
          <Button onClick={onSubmit} disabled={saving} className="bg-[#0e5631] hover:bg-[#0b4728]">
            <Save className="h-4 w-4" aria-hidden="true" />
            Crear tipo
          </Button>
        </div>
      </section>
    </div>
  )
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800">
      <span>
        <span className="block">{label}</span>
        <span className="block text-xs font-semibold text-slate-500">{description}</span>
      </span>
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-emerald-700' : 'bg-slate-300')}>
        <input className="sr-only" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white shadow transition', checked ? 'left-6' : 'left-1')} />
      </span>
    </label>
  )
}
