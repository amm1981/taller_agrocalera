import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import {
  RegistroMeta,
  RegistroReadings,
  RegistroState,
  RegistroSummary,
} from '../features/horometros/components/HorometroTableHelpers'
import { HorometrosNav } from '../features/horometros/components/HorometrosNav'
import { getHorometroPendientes, registrarCierre } from '../features/horometros/horometrosService'
import type { HorometroRegistro } from '../features/horometros/types'
import { AppLayout } from '../layouts/AppLayout'

export function HorometrosPendientesPage() {
  const [fecha, setFecha] = useState('')
  const pendientes = useQuery({
    queryKey: ['horometros-pendientes', fecha],
    queryFn: () => getHorometroPendientes({ fecha: fecha || undefined, per_page: 50 }),
  })

  return (
    <AppLayout title="Pendientes de cierre" description="Equipos en jornada o con inconsistencias por completar">
      <HorometrosNav />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <FilterField label="Fecha">
          <input className={inputClass} type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
        </FilterField>
        <Button variant="secondary" onClick={() => void pendientes.refetch()} disabled={pendientes.isFetching}>
          <RefreshCw className={`h-4 w-4 ${pendientes.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          Actualizar
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1060px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3">Equipo</th>
                <th className="border-b border-slate-200 px-4 py-3">Operador / fecha</th>
                <th className="border-b border-slate-200 px-4 py-3">Lecturas</th>
                <th className="border-b border-slate-200 px-4 py-3">Estado</th>
                <th className="border-b border-slate-200 px-4 py-3">Registrar cierre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(pendientes.data?.data ?? []).map((registro) => (
                <PendienteRow key={registro.id} registro={registro} />
              ))}
              {!pendientes.isLoading && !pendientes.data?.data.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">No hay pendientes de cierre.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppLayout>
  )
}

function PendienteRow({ registro }: { registro: HorometroRegistro }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    horometro_final_confirmado: '',
    horometro_final_ocr: '',
    foto_final: 'captura-web-cierre.jpg',
    fecha_hora_final: '',
    correccion_manual_final: false,
  })
  const close = useMutation({
    mutationFn: () =>
      registrarCierre(registro.id, {
        horometro_final_confirmado: form.horometro_final_confirmado,
        horometro_final_ocr: form.horometro_final_ocr || null,
        foto_final: form.foto_final,
        fecha_hora_final: form.fecha_hora_final || undefined,
        correccion_manual_final: form.correccion_manual_final,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['horometros-pendientes'] })
      await queryClient.invalidateQueries({ queryKey: ['horometros-dashboard'] })
      await queryClient.invalidateQueries({ queryKey: ['horometros-registros'] })
    },
  })

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3 align-top"><RegistroSummary registro={registro} /></td>
      <td className="px-4 py-3 align-top"><RegistroMeta registro={registro} /></td>
      <td className="px-4 py-3 align-top"><RegistroReadings registro={registro} /></td>
      <td className="px-4 py-3 align-top"><RegistroState registro={registro} /></td>
      <td className="px-4 py-3 align-top">
        <form
          className="grid min-w-[360px] gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            close.mutate()
          }}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <input required className={inputClass} inputMode="decimal" placeholder="Lectura final" value={form.horometro_final_confirmado} onChange={(event) => setForm((current) => ({ ...current, horometro_final_confirmado: event.target.value }))} />
            <input className={inputClass} inputMode="decimal" placeholder="OCR final" value={form.horometro_final_ocr} onChange={(event) => setForm((current) => ({ ...current, horometro_final_ocr: event.target.value }))} />
            <input required className={inputClass} placeholder="Referencia foto" value={form.foto_final} onChange={(event) => setForm((current) => ({ ...current, foto_final: event.target.value }))} />
            <input className={inputClass} type="datetime-local" value={form.fecha_hora_final} onChange={(event) => setForm((current) => ({ ...current, fecha_hora_final: event.target.value }))} />
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={form.correccion_manual_final} onChange={(event) => setForm((current) => ({ ...current, correccion_manual_final: event.target.checked }))} />
            Corrección manual
          </label>
          <Button type="submit" disabled={close.isPending}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Cerrar jornada
          </Button>
          {close.isError ? <span className="text-xs font-medium text-rose-700">No se pudo cerrar este registro.</span> : null}
        </form>
      </td>
    </tr>
  )
}
