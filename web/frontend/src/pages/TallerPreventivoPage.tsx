import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, CheckCircle2, Gauge, TimerReset, Tractor } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MetricCard } from '../components/common/MetricCard'
import { StatusBadge } from '../features/taller/components/StatusBadge'
import { TallerNav } from '../features/taller/components/TallerNav'
import { vehicleName } from '../features/taller/components/tallerFormatters'
import { getPreventivos } from '../features/vehiculos/vehiculosService'
import type { MantenimientoPreventivoPlan } from '../features/vehiculos/types'
import { AppLayout } from '../layouts/AppLayout'
import { cn } from '../utils/cn'

function numberValue(value: string | number | null | undefined, suffix = '') {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  return `${Number(value).toLocaleString('es-PE', { maximumFractionDigits: 1 })}${suffix}`
}

function progressTone(plan?: MantenimientoPreventivoPlan | null) {
  if (!plan) {
    return 'bg-slate-300'
  }

  if (plan.estado === 'VENCIDO') {
    return 'bg-rose-600'
  }

  if (plan.estado === 'PROXIMO') {
    return 'bg-amber-500'
  }

  return 'bg-emerald-600'
}

export function TallerPreventivoPage() {
  const preventivos = useQuery({
    queryKey: ['taller-preventivos'],
    queryFn: getPreventivos,
  })

  const resumen = preventivos.data?.resumen

  return (
    <AppLayout title="Taller · Preventivo" description="Servicios programados según horómetro actual">
      <TallerNav />

      <div className="mb-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Vencidos" value={resumen?.vencidos ?? 0} icon={<AlertTriangle className="h-7 w-7" aria-hidden="true" />} tone="red" delta={`${resumen?.total ?? 0}`} trend="equipos evaluados" />
        <MetricCard label="Próximos" value={resumen?.proximos ?? 0} icon={<TimerReset className="h-7 w-7" aria-hidden="true" />} tone="amber" delta="25 h" trend="umbral base" />
        <MetricCard label="Al día" value={resumen?.al_dia ?? 0} icon={<CheckCircle2 className="h-7 w-7" aria-hidden="true" />} tone="green" delta="+ 0" trend="sin acción inmediata" />
        <MetricCard label="Sin horómetro" value={resumen?.sin_horometro ?? 0} icon={<Gauge className="h-7 w-7" aria-hidden="true" />} tone="blue" delta="+ 0" trend="requieren lectura" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">Plan preventivo por equipo</h2>
            <p className="text-sm text-slate-500">Cálculo basado en el último horómetro confirmado</p>
          </div>
          <Activity className="h-5 w-5 text-emerald-700" aria-hidden="true" />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-100 px-5 py-4">Equipo</th>
                <th className="border-b border-slate-100 px-5 py-4">Tipo</th>
                <th className="border-b border-slate-100 px-5 py-4">Horómetro</th>
                <th className="border-b border-slate-100 px-5 py-4">Plan crítico</th>
                <th className="border-b border-slate-100 px-5 py-4">Próximo servicio</th>
                <th className="border-b border-slate-100 px-5 py-4">Restante</th>
                <th className="border-b border-slate-100 px-5 py-4">Avance</th>
                <th className="border-b border-slate-100 px-5 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(preventivos.data?.data ?? []).map((row) => {
                const plan = row.preventivo.plan_critico

                return (
                  <tr key={row.vehiculo.id} className="hover:bg-emerald-50/25">
                    <td className="px-5 py-4 align-top">
                      <Link className="flex items-center gap-3 font-black text-slate-950 hover:text-emerald-700" to={`/vehiculos/${row.vehiculo.id}`}>
                        <Tractor className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                        {vehicleName(row.vehiculo)}
                      </Link>
                      <div className="mt-1 text-xs font-medium text-slate-500">{row.vehiculo.sede?.nombre ?? '-'}</div>
                    </td>
                    <td className="px-5 py-4 align-top text-slate-700">{row.vehiculo.tipo_vehiculo?.nombre ?? '-'}</td>
                    <td className="px-5 py-4 align-top font-black text-slate-950">
                      {numberValue(row.preventivo.horometro_actual)}
                    </td>
                    <td className="max-w-[300px] px-5 py-4 align-top">
                      <div className="font-bold text-slate-950">{plan?.nombre ?? 'Sin plan'}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{plan?.descripcion ?? 'No hay plan activo para este tipo.'}</div>
                    </td>
                    <td className="px-5 py-4 align-top font-semibold text-slate-700">
                      {numberValue(plan?.proximo_servicio_horas, ' h')}
                    </td>
                    <td className="px-5 py-4 align-top font-black text-slate-950">
                      {numberValue(plan?.horas_restantes, ' h')}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn('h-full rounded-full', progressTone(plan))}
                          style={{ width: `${Math.min(100, plan?.porcentaje_ciclo ?? 0)}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs font-bold text-slate-500">{numberValue(plan?.porcentaje_ciclo, '%')}</div>
                    </td>
                    <td className="px-5 py-4 align-top"><StatusBadge value={row.preventivo.estado} /></td>
                  </tr>
                )
              })}
              {!preventivos.isLoading && !preventivos.data?.data.length ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm font-medium text-slate-500">
                    No hay equipos con horómetro configurado.
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
