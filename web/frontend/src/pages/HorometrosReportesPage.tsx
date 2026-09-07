import { useQuery } from '@tanstack/react-query'
import { BarChart3, CheckCircle2, Clock3, Tractor } from 'lucide-react'
import { useState } from 'react'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import { vehicleName } from '../features/taller/components/tallerFormatters'
import { HorometroPanel, MetricTile, SoftStat } from '../features/horometros/components/HorometroCards'
import { HorometrosNav } from '../features/horometros/components/HorometrosNav'
import { getHorometrosReporte } from '../features/horometros/horometrosService'
import { AppLayout } from '../layouts/AppLayout'

export function HorometrosReportesPage() {
  const [filters, setFilters] = useState({ fecha_desde: '', fecha_hasta: '' })
  const reporte = useQuery({
    queryKey: ['horometros-reporte', filters],
    queryFn: () => getHorometrosReporte(filters),
  })

  return (
    <AppLayout title="Reportes de horómetros" description="Horas trabajadas y productividad por equipo">
      <HorometrosNav />

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 sm:grid-cols-2 xl:w-[520px]">
          <FilterField label="Fecha desde">
            <input className={inputClass} type="date" value={filters.fecha_desde} onChange={(event) => setFilters((current) => ({ ...current, fecha_desde: event.target.value }))} />
          </FilterField>
          <FilterField label="Fecha hasta">
            <input className={inputClass} type="date" value={filters.fecha_hasta} onChange={(event) => setFilters((current) => ({ ...current, fecha_hasta: event.target.value }))} />
          </FilterField>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <HorometroPanel title="Resumen del período" icon={<BarChart3 className="h-4 w-4 text-emerald-700" aria-hidden="true" />} tone="mint">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile
              label="Horas totales"
              value={reporte.data?.horas_totales ?? 0}
              accent="border-sky-100 bg-sky-50"
              icon={<Clock3 className="h-4 w-4 text-sky-700" aria-hidden="true" />}
            />
            <MetricTile
              label="Registros completos"
              value={reporte.data?.registros_completos ?? 0}
              accent="border-emerald-100 bg-emerald-50"
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />}
            />
          </div>
        </HorometroPanel>

        <HorometroPanel title="Horas por equipo" icon={<Tractor className="h-4 w-4 text-orange-700" aria-hidden="true" />} tone="amber">
          <div className="grid gap-2">
            {(reporte.data?.por_vehiculo ?? []).map((item) => (
              <SoftStat key={item.vehiculo?.id ?? item.vehiculo?.codigo ?? item.horas} label={vehicleName(item.vehiculo)} value={`${item.horas} h`} positive />
            ))}
            {!reporte.isLoading && !reporte.data?.por_vehiculo.length ? (
              <div className="rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">Sin horas registradas para el período.</div>
            ) : null}
          </div>
        </HorometroPanel>
      </div>
    </AppLayout>
  )
}
