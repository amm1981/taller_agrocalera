import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ClipboardList, Download, PackageCheck, Plus, Search, Wrench } from 'lucide-react'
import { useMemo } from 'react'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { MetricCard } from '../components/common/MetricCard'
import { getGerencias, getTecnicos, getVehiculos } from '../features/maestros/masterDataService'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import { OrdenesTable } from '../features/taller/components/OrdenesTable'
import { getOrdenes, getTallerDashboard } from '../features/taller/tallerService'
import type { OrdenTrabajoFilters } from '../features/taller/types'
import { AppLayout } from '../layouts/AppLayout'

const orderStates = [
  'PENDIENTE',
  'EN_CURSO',
  'ESPERANDO_REPUESTO',
  'FINALIZADA_CON_PENDIENTE',
  'FINALIZADA',
]

export function TallerOrdenesPage() {
  const [filters, setFilters] = useState<OrdenTrabajoFilters>({ per_page: 30 })
  const orders = useQuery({
    queryKey: ['taller-ordenes', filters],
    queryFn: () => getOrdenes(filters),
  })
  const dashboard = useQuery({
    queryKey: ['taller-dashboard'],
    queryFn: getTallerDashboard,
  })
  const gerencias = useQuery({ queryKey: ['gerencias'], queryFn: getGerencias })
  const vehiculos = useQuery({ queryKey: ['vehiculos'], queryFn: getVehiculos })
  const tecnicos = useQuery({ queryKey: ['tecnicos'], queryFn: getTecnicos })

  const updateFilter = (key: keyof OrdenTrabajoFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }))
  }

  const csvRows = useMemo(
    () =>
      (orders.data?.data ?? []).map((order) => [
        order.numero_ot ?? order.id,
        order.fecha_reporte,
        order.vehiculo?.codigo ?? '',
        order.tipo_falla?.nombre ?? '',
        order.tecnico ? `${order.tecnico.nombres} ${order.tecnico.apellidos}` : '',
        order.estado,
        order.estado_equipo,
      ]),
    [orders.data?.data],
  )

  const exportCsv = () => {
    const header = ['ot', 'fecha', 'equipo', 'falla', 'tecnico', 'estado', 'estado_equipo']
    const body = csvRows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    const blob = new Blob([[header.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ordenes-taller.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout title="Taller · Órdenes de trabajo" description="Consulta y seguimiento de atención técnica">
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FilterField label="Fecha desde">
            <input
              className={inputClass}
              type="date"
              value={filters.fecha_desde ?? ''}
              onChange={(event) => updateFilter('fecha_desde', event.target.value)}
            />
          </FilterField>
          <FilterField label="Fecha hasta">
            <input
              className={inputClass}
              type="date"
              value={filters.fecha_hasta ?? ''}
              onChange={(event) => updateFilter('fecha_hasta', event.target.value)}
            />
          </FilterField>
          <FilterField label="Gerencia">
            <select className={inputClass} value={filters.gerencia_id ?? ''} onChange={(event) => updateFilter('gerencia_id', event.target.value)}>
              <option value="">Todas</option>
              {(gerencias.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Equipo">
            <select className={inputClass} value={filters.vehiculo_id ?? ''} onChange={(event) => updateFilter('vehiculo_id', event.target.value)}>
              <option value="">Todos</option>
              {(vehiculos.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.codigo} {item.nombre}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Técnico">
            <select className={inputClass} value={filters.tecnico_id ?? ''} onChange={(event) => updateFilter('tecnico_id', event.target.value)}>
              <option value="">Todos</option>
              {(tecnicos.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.nombres} {item.apellidos}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Estado">
            <select className={inputClass} value={filters.estado ?? ''} onChange={(event) => updateFilter('estado', event.target.value)}>
              <option value="">Todos</option>
              {orderStates.map((state) => (
                <option key={state} value={state}>{state.replaceAll('_', ' ')}</option>
              ))}
            </select>
          </FilterField>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              className={`${inputClass} w-full pl-9`}
              value={filters.q ?? ''}
              onChange={(event) => updateFilter('q', event.target.value)}
              placeholder="Buscar OT, equipo o detalle..."
            />
          </div>
          <Button variant="secondary" onClick={() => setFilters({ per_page: 30 })}>Limpiar</Button>
          <Button variant="secondary" onClick={exportCsv} disabled={!csvRows.length}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Exportar
          </Button>
          <Button>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva OT
          </Button>
        </div>
      </section>

      <div className="mb-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pendientes" value={dashboard.data?.ordenes.pendientes ?? 0} icon={<ClipboardList className="h-7 w-7" aria-hidden="true" />} tone="amber" delta="+ 5%" />
        <MetricCard label="En curso" value={dashboard.data?.ordenes.en_curso ?? 0} icon={<Wrench className="h-7 w-7" aria-hidden="true" />} tone="green" delta="+ 4%" />
        <MetricCard label="Esperando repuesto" value={dashboard.data?.ordenes.esperando_repuesto ?? 0} icon={<PackageCheck className="h-7 w-7" aria-hidden="true" />} tone="orange" delta="+ 2%" />
        <MetricCard label="Finalizadas" value={dashboard.data?.ordenes.finalizadas ?? 0} icon={<CheckCircle2 className="h-7 w-7" aria-hidden="true" />} tone="blue" delta="+ 8%" />
      </div>

      {orders.isError ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          No se pudieron cargar las órdenes. Verifica que el backend esté activo y que tu sesión siga vigente.
        </div>
      ) : null}

      <OrdenesTable data={orders.data?.data} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600">
        <span>
          Mostrando {orders.data?.data.length ?? 0} de <strong className="text-slate-900">{orders.data?.meta.total ?? 0}</strong> resultados
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={(orders.data?.meta.current_page ?? 1) <= 1}
            onClick={() => setFilters((current) => ({ ...current, page: (orders.data?.meta.current_page ?? 1) - 1 }))}
          >
            ‹
          </Button>
          <span className="rounded-lg bg-emerald-700 px-4 py-2 font-black text-white">{orders.data?.meta.current_page ?? 1}</span>
          <Button
            variant="secondary"
            disabled={(orders.data?.meta.current_page ?? 1) >= (orders.data?.meta.last_page ?? 1)}
            onClick={() => setFilters((current) => ({ ...current, page: (orders.data?.meta.current_page ?? 1) + 1 }))}
          >
            ›
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
