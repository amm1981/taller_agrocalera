import { useQuery } from '@tanstack/react-query'
import { BarChart3, Clock3, Tractor, UserRoundCheck } from 'lucide-react'
import { StatusBadge } from '../features/taller/components/StatusBadge'
import { TallerNav } from '../features/taller/components/TallerNav'
import {
  formatMinutes,
  orderNumber,
  personName,
  vehicleName,
} from '../features/taller/components/tallerFormatters'
import {
  getReporteBacklog,
  getReporteEquipos,
  getReporteTecnicos,
  getReporteTiempos,
} from '../features/taller/tallerService'
import { AppLayout } from '../layouts/AppLayout'

export function TallerReportesPage() {
  const tiempos = useQuery({ queryKey: ['taller-reporte-tiempos'], queryFn: getReporteTiempos })
  const equipos = useQuery({ queryKey: ['taller-reporte-equipos'], queryFn: getReporteEquipos })
  const tecnicos = useQuery({ queryKey: ['taller-reporte-tecnicos'], queryFn: getReporteTecnicos })
  const backlog = useQuery({ queryKey: ['taller-reporte-backlog'], queryFn: getReporteBacklog })

  const timeCards = [
    ['Respuesta promedio', tiempos.data?.tiempo_promedio_respuesta_minutos],
    ['Atención promedio', tiempos.data?.tiempo_promedio_atencion_minutos],
    ['Requerimiento promedio', tiempos.data?.tiempo_promedio_requerimiento_minutos],
    ['MTTR', tiempos.data?.mttr_minutos],
  ] as const

  return (
    <AppLayout title="Reportes de Taller" description="Indicadores básicos de tiempos, equipos, técnicos y backlog">
      <TallerNav />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {timeCards.map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <Clock3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">{formatMinutes(value)}</div>
          </div>
        ))}
      </section>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <Tractor className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-950">Órdenes por equipo</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {(equipos.data ?? []).slice(0, 8).map((item) => (
              <li key={item.vehiculo?.id ?? item.vehiculo?.codigo ?? item.total_ordenes} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_90px_90px_90px]">
                <span className="font-medium text-slate-900">{vehicleName(item.vehiculo)}</span>
                <Metric label="Total" value={item.total_ordenes} />
                <Metric label="Pend." value={item.pendientes} />
                <Metric label="Fin." value={item.finalizadas} />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <UserRoundCheck className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-950">Carga por técnico</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {(tecnicos.data ?? []).slice(0, 8).map((item) => (
              <li key={item.tecnico?.id ?? item.total_ordenes} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_90px_90px_90px]">
                <span className="font-medium text-slate-900">{personName(item.tecnico)}</span>
                <Metric label="Total" value={item.total_ordenes} />
                <Metric label="Curso" value={item.en_curso} />
                <Metric label="Fin." value={item.finalizadas} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-5 rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <BarChart3 className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-950">Backlog reportado</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-3 py-3">OT</th>
                <th className="border-b border-slate-200 px-3 py-3">Equipo</th>
                <th className="border-b border-slate-200 px-3 py-3">Pendiente</th>
                <th className="border-b border-slate-200 px-3 py-3">Antigüedad</th>
                <th className="border-b border-slate-200 px-3 py-3">Estado equipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(backlog.data ?? []).map((item) => (
                <tr key={item.orden.id}>
                  <td className="px-3 py-3 font-semibold text-slate-950">{orderNumber(item.orden)}</td>
                  <td className="px-3 py-3 text-slate-700">{vehicleName(item.orden.vehiculo)}</td>
                  <td className="max-w-[360px] px-3 py-3 text-slate-700">{item.orden.trabajo_pendiente || '-'}</td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{item.antiguedad_dias} días</td>
                  <td className="px-3 py-3"><StatusBadge value={item.orden.estado_equipo} /></td>
                </tr>
              ))}
              {!backlog.isLoading && !backlog.data?.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-500">
                    Sin backlog para reportar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppLayout>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1 text-slate-600">
      <span className="text-xs uppercase">{label}</span>
      <strong className="text-slate-900">{value}</strong>
    </span>
  )
}
