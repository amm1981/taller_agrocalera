import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  Gauge,
  ListChecks,
  RefreshCw,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { getVehiculos } from '../features/maestros/masterDataService'
import {
  getFundosMaster,
  getLotesMaster,
  getSedesMaster,
  getTiposVehiculoMaster,
} from '../features/maestros/maestrosService'
import { getHorometrosDashboard } from '../features/horometros/horometrosService'
import type { HorometroFilters } from '../features/horometros/types'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import { vehicleName } from '../features/taller/components/tallerFormatters'
import { AppLayout } from '../layouts/AppLayout'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function metricPercent(done?: number, expected?: number) {
  if (!expected) {
    return '0%'
  }

  return `${Math.round(((done ?? 0) / expected) * 100)}%`
}

export function HorometrosDashboardPage() {
  const [filters, setFilters] = useState<HorometroFilters>({
    fecha_desde: today(),
    fecha_hasta: today(),
  })

  const dashboard = useQuery({
    queryKey: ['horometros-dashboard', filters],
    queryFn: () => getHorometrosDashboard(filters),
  })
  const sedes = useQuery({ queryKey: ['maestros-sedes-lookup'], queryFn: getSedesMaster })
  const fundos = useQuery({ queryKey: ['maestros-fundos-lookup'], queryFn: getFundosMaster })
  const lotes = useQuery({ queryKey: ['maestros-lotes-lookup'], queryFn: getLotesMaster })
  const vehiculos = useQuery({ queryKey: ['vehiculos'], queryFn: getVehiculos })
  const tiposVehiculo = useQuery({ queryKey: ['tipos-vehiculo'], queryFn: getTiposVehiculoMaster })

  const data = dashboard.data
  const updateFilter = (key: keyof HorometroFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value || undefined }))
  }

  return (
    <AppLayout title="Horómetros · Dashboard" description="Estado operativo de registros y cierres">
      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <FilterField label="Desde">
            <input className={inputClass} type="date" value={filters.fecha_desde ?? ''} onChange={(event) => updateFilter('fecha_desde', event.target.value)} />
          </FilterField>
          <FilterField label="Hasta">
            <input className={inputClass} type="date" value={filters.fecha_hasta ?? ''} onChange={(event) => updateFilter('fecha_hasta', event.target.value)} />
          </FilterField>
          <FilterField label="Sede">
            <select className={inputClass} value={filters.sede_id ?? ''} onChange={(event) => updateFilter('sede_id', event.target.value)}>
              <option value="">Todas</option>
              {(sedes.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </FilterField>
          <FilterField label="Fundo">
            <select className={inputClass} value={filters.fundo_id ?? ''} onChange={(event) => updateFilter('fundo_id', event.target.value)}>
              <option value="">Todos</option>
              {(fundos.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </FilterField>
          <FilterField label="Lote">
            <select className={inputClass} value={filters.lote_id ?? ''} onChange={(event) => updateFilter('lote_id', event.target.value)}>
              <option value="">Todos</option>
              {(lotes.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </FilterField>
          <div className="flex items-end">
            <Button className="w-full" variant="secondary" onClick={() => void dashboard.refetch()} disabled={dashboard.isFetching}>
              <RefreshCw className={`h-4 w-4 ${dashboard.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
              Actualizar
            </Button>
          </div>
          <FilterField label="Tipo vehículo">
            <select className={inputClass} value={filters.tipo_vehiculo_id ?? ''} onChange={(event) => updateFilter('tipo_vehiculo_id', event.target.value)}>
              <option value="">Todos</option>
              {(tiposVehiculo.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </FilterField>
          <FilterField label="Vehículo">
            <select className={inputClass} value={filters.vehiculo_id ?? ''} onChange={(event) => updateFilter('vehiculo_id', event.target.value)}>
              <option value="">Todos</option>
              {(vehiculos.data ?? []).map((item) => <option key={item.id} value={item.id}>{vehicleName(item)}</option>)}
            </select>
          </FilterField>
        </div>
      </section>

      <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Inicios" value={`${data?.inicios_registrados ?? 0}/${data?.inicios_esperados ?? 0}`} hint={metricPercent(data?.inicios_registrados, data?.inicios_esperados)} icon={<Gauge />} tone="emerald" />
        <Kpi title="Cierres" value={`${data?.cierres_registrados ?? 0}/${data?.cierres_esperados ?? 0}`} hint={metricPercent(data?.cierres_registrados, data?.cierres_esperados)} icon={<CheckCircle2 />} tone="blue" />
        <Kpi title="Pendientes de cierre" value={data?.pendientes_cierre ?? 0} hint="por atender" icon={<Clock3 />} tone="amber" />
        <Kpi title="Inconsistencias" value={data?.inconsistencias ?? 0} hint="fuera de regla" icon={<AlertTriangle />} tone="rose" />
        <Kpi title="Observados" value={data?.observados ?? 0} hint="revisión" icon={<ListChecks />} tone="rose" />
        <Kpi title="Correcciones manuales" value={data?.correcciones_manuales ?? 0} hint="OCR corregido" icon={<Wrench />} tone="slate" />
        <Kpi title="Sin registro" value={data?.vehiculos_sin_registro ?? 0} hint="esperados" icon={<Camera />} tone="amber" />
        <Kpi title="Jornada completa" value={data?.vehiculos_jornada_completa ?? 0} hint="vehículos" icon={<TrendingUp />} tone="emerald" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-black text-slate-950">Top vehículos por horas</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {(data?.top_vehiculos_horas ?? []).map((item, index) => (
              <div key={`${item.vehiculo_id}-${index}`} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 px-4 py-3 text-sm">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 font-black text-emerald-800">{index + 1}</span>
                <div>
                  <div className="font-bold text-slate-900">{vehicleName(item.vehiculo)}</div>
                  <div className="text-xs font-medium text-slate-500">{item.vehiculo?.placa ?? 'Sin placa'}</div>
                </div>
                <strong className="text-slate-950">{Number(item.horas).toFixed(2)} h</strong>
              </div>
            ))}
            {!data?.top_vehiculos_horas?.length ? <Empty text="No hay horas registradas en el rango." /> : null}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-black text-slate-950">Alertas del rango</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {(data?.alertas ?? []).map((alerta) => (
              <div key={alerta.tipo} className="flex gap-3 px-4 py-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                <span className="font-medium text-slate-700">{alerta.mensaje}</span>
              </div>
            ))}
            {!data?.alertas?.length ? <Empty text="Sin alertas operativas." /> : null}
          </div>
        </section>
      </div>
    </AppLayout>
  )
}

function Kpi({
  title,
  value,
  hint,
  icon,
  tone,
}: {
  title: string
  value: string | number
  hint: string
  icon: ReactNode
  tone: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate'
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{hint}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${tones[tone]}`}>
          <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        </div>
      </div>
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-sm font-medium text-slate-500">{text}</div>
}
