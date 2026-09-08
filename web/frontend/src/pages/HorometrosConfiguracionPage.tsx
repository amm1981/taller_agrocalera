import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import {
  getHorometroConfiguraciones,
  updateHorometroConfiguracionTipo,
} from '../features/horometros/horometrosService'
import type { HorometroConfiguracion, HorometroConfiguracionPorTipo } from '../features/horometros/types'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import { AppLayout } from '../layouts/AppLayout'

type FormState = Omit<HorometroConfiguracion, 'id' | 'tipo_vehiculo_id'>

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
  const configuraciones = useQuery({
    queryKey: ['horometros-configuraciones'],
    queryFn: getHorometroConfiguraciones,
  })
  const [forms, setForms] = useState<Record<number, FormState>>({})
  const update = useMutation({
    mutationFn: ({ tipoVehiculoId, payload }: { tipoVehiculoId: number; payload: FormState }) => updateHorometroConfiguracionTipo(tipoVehiculoId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['horometros-configuraciones'] })
      await queryClient.invalidateQueries({ queryKey: ['horometros-configuracion'] })
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

  const patchPersonalTypes = (tipoVehiculoId: number, value: string) => {
    const personalTipos = value
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)

    setForms((current) => ({
      ...current,
      [tipoVehiculoId]: {
        ...current[tipoVehiculoId],
        parametros_adicionales: {
          ...(current[tipoVehiculoId]?.parametros_adicionales ?? {}),
          personal_tipos: personalTipos,
        },
      },
    }))
  }

  return (
    <AppLayout title="Horómetros · Configuración" description="Parámetros por tipo de registro para web y aplicativo">
      <div className="grid gap-5">
        {(configuraciones.data ?? []).map((item) => (
          <TipoRegistroConfigCard
            key={item.tipo_vehiculo.id}
            item={item}
            form={forms[item.tipo_vehiculo.id]}
            saving={update.isPending}
            onPatch={patch}
            onPatchRequired={patchRequiredField}
            onPatchPersonalTypes={patchPersonalTypes}
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
    </AppLayout>
  )
}

function TipoRegistroConfigCard({
  item,
  form,
  saving,
  onPatch,
  onPatchRequired,
  onPatchPersonalTypes,
  onSave,
}: {
  item: HorometroConfiguracionPorTipo
  form?: FormState
  saving: boolean
  onPatch: <K extends keyof FormState>(tipoVehiculoId: number, key: K, value: FormState[K]) => void
  onPatchRequired: (tipoVehiculoId: number, key: keyof NonNullable<FormState['campos_requeridos']>, value: boolean) => void
  onPatchPersonalTypes: (tipoVehiculoId: number, value: string) => void
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
  const personalTypesText = (form.parametros_adicionales?.personal_tipos ?? []).join(', ')

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
          <Settings2 className="h-5 w-5" aria-hidden="true" />
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
          <FilterField label="Tipos de personal separados por coma">
            <input
              className={inputClass}
              value={personalTypesText}
              onChange={(event) => onPatchPersonalTypes(tipoId, event.target.value)}
              placeholder="Ejemplo: TRACTORISTA, OPERARIO, CONDUCTOR"
            />
          </FilterField>
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">
      <span>{label}</span>
      <input className="h-5 w-5 accent-emerald-700" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}
