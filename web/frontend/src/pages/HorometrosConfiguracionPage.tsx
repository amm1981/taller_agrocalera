import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import {
  getHorometroConfiguracion,
  updateHorometroConfiguracion,
} from '../features/horometros/horometrosService'
import type { HorometroConfiguracion } from '../features/horometros/types'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import { AppLayout } from '../layouts/AppLayout'

type FormState = Omit<HorometroConfiguracion, 'id'>

const initialForm: FormState = {
  hora_inicio_desde: '07:00',
  hora_inicio_hasta: '08:00',
  hora_cierre_hasta: '19:30',
  tolerancia_inicio_horas: 0,
  tolerancia_maxima_horas_dia: 24,
  permite_correccion_manual: true,
  foto_obligatoria: true,
  vigencia_reapertura_minutos: 120,
  ocr_activo: true,
}

export function HorometrosConfiguracionPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(initialForm)
  const config = useQuery({
    queryKey: ['horometros-configuracion'],
    queryFn: getHorometroConfiguracion,
  })
  const update = useMutation({
    mutationFn: updateHorometroConfiguracion,
    onSuccess: async (saved) => {
      setForm(normalizeConfig(saved))
      await queryClient.invalidateQueries({ queryKey: ['horometros-configuracion'] })
    },
  })

  useEffect(() => {
    if (config.data) {
      setForm(normalizeConfig(config.data))
    }
  }, [config.data])

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <AppLayout title="Horómetros · Configuración" description="Horarios permitidos, tolerancias y reglas operativas">
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
            <Settings2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-950">Parámetros del módulo</h2>
            <p className="text-sm font-medium text-slate-500">Estos valores aplican a la web y al aplicativo.</p>
          </div>
        </div>

        <div className="grid gap-5 p-5 xl:grid-cols-2">
          <div className="grid gap-4 rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-black uppercase text-slate-500">Horarios de registro</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <FilterField label="Inicio desde">
                <input className={inputClass} type="time" value={form.hora_inicio_desde} onChange={(event) => patch('hora_inicio_desde', event.target.value)} />
              </FilterField>
              <FilterField label="Inicio hasta">
                <input className={inputClass} type="time" value={form.hora_inicio_hasta} onChange={(event) => patch('hora_inicio_hasta', event.target.value)} />
              </FilterField>
              <FilterField label="Cierre máximo">
                <input className={inputClass} type="time" value={form.hora_cierre_hasta} onChange={(event) => patch('hora_cierre_hasta', event.target.value)} />
              </FilterField>
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-black uppercase text-slate-500">Tolerancias</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <FilterField label="Diferencia inicio">
                <input className={inputClass} type="number" min={0} step="0.01" value={form.tolerancia_inicio_horas} onChange={(event) => patch('tolerancia_inicio_horas', event.target.value)} />
              </FilterField>
              <FilterField label="Máx. horas día">
                <input className={inputClass} type="number" min={0} step="0.01" value={form.tolerancia_maxima_horas_dia} onChange={(event) => patch('tolerancia_maxima_horas_dia', event.target.value)} />
              </FilterField>
              <FilterField label="Vigencia reapertura">
                <input className={inputClass} type="number" min={15} max={1440} value={form.vigencia_reapertura_minutos} onChange={(event) => patch('vigencia_reapertura_minutos', Number(event.target.value))} />
              </FilterField>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-200 p-4 xl:col-span-2">
            <h3 className="text-sm font-black uppercase text-slate-500">Reglas de captura</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <Toggle label="OCR activo" checked={form.ocr_activo} onChange={(value) => patch('ocr_activo', value)} />
              <Toggle label="Permitir corrección manual" checked={form.permite_correccion_manual} onChange={(value) => patch('permite_correccion_manual', value)} />
              <Toggle label="Foto obligatoria" checked={form.foto_obligatoria} onChange={(value) => patch('foto_obligatoria', value)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-4">
          <Button disabled={update.isPending} onClick={() => update.mutate(form)}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Guardar configuración
          </Button>
        </div>
      </section>
    </AppLayout>
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
  }
}
