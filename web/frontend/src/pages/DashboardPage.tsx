import { useQuery } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  Gauge,
  Tractor,
  Wrench,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { MetricCard } from '../components/common/MetricCard'
import { getDashboardSummary } from '../features/dashboard/dashboardService'
import { AppLayout } from '../layouts/AppLayout'

const weekBars = [
  { day: 'Lun', value: 58 },
  { day: 'Mar', value: 74 },
  { day: 'Mié', value: 81 },
  { day: 'Jue', value: 69 },
  { day: 'Vie', value: 77 },
  { day: 'Sáb', value: 41 },
  { day: 'Dom', value: 28 },
]

export function DashboardPage() {
  const dashboard = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  })

  const topMetrics = [
    {
      label: 'Equipos activos',
      value: dashboard.data?.flota.activos ?? 0,
      icon: <Tractor className="h-7 w-7" aria-hidden="true" />,
      tone: 'green' as const,
      delta: '+ 8%',
    },
    {
      label: 'OT pendientes',
      value: dashboard.data?.taller.ordenes.pendientes ?? 0,
      icon: <ClipboardList className="h-7 w-7" aria-hidden="true" />,
      tone: 'amber' as const,
      delta: '+ 5%',
    },
    {
      label: 'Registros de hoy',
      value: dashboard.data?.horometros.inicios_registrados ?? 0,
      icon: <ClipboardList className="h-7 w-7" aria-hidden="true" />,
      tone: 'blue' as const,
      delta: '+ 12%',
    },
    {
      label: 'Inconsistencias',
      value: dashboard.data?.horometros.observados ?? 0,
      icon: <AlertTriangle className="h-7 w-7" aria-hidden="true" />,
      tone: 'red' as const,
      delta: '+ 2',
    },
  ]

  return (
    <AppLayout title="Dashboard General" description="Resumen operativo de flota, taller y horómetros">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {topMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <ModulePanel
          title="Taller"
          icon={<Wrench className="h-5 w-5 text-slate-700" aria-hidden="true" />}
          to="/taller/ordenes"
          items={[
            {
              label: 'Pendientes',
              value: dashboard.data?.taller.ordenes.pendientes ?? 0,
              icon: <ClipboardList className="h-6 w-6 text-amber-700" aria-hidden="true" />,
              tone: 'bg-amber-50',
              bar: 'bg-amber-600',
            },
            {
              label: 'En curso',
              value: dashboard.data?.taller.ordenes.en_curso ?? 0,
              icon: <Wrench className="h-6 w-6 text-emerald-700" aria-hidden="true" />,
              tone: 'bg-emerald-50',
              bar: 'bg-emerald-600',
            },
            {
              label: 'Esperando repuesto',
              value: dashboard.data?.taller.ordenes.esperando_repuesto ?? 0,
              icon: <ClipboardList className="h-6 w-6 text-orange-700" aria-hidden="true" />,
              tone: 'bg-orange-50',
              bar: 'bg-orange-600',
            },
            {
              label: 'Backlog',
              value: dashboard.data?.taller.ordenes.backlog ?? 0,
              icon: <Clock3 className="h-6 w-6 text-violet-700" aria-hidden="true" />,
              tone: 'bg-violet-50',
              bar: 'bg-violet-600',
            },
          ]}
        />

        <ModulePanel
          title="Horómetros"
          icon={<Gauge className="h-5 w-5 text-slate-700" aria-hidden="true" />}
          to="/horometros"
          items={[
            {
              label: 'Inicios registrados',
              value: dashboard.data?.horometros.inicios_registrados ?? 0,
              icon: <Gauge className="h-6 w-6 text-emerald-700" aria-hidden="true" />,
              tone: 'bg-emerald-50',
              bar: 'bg-emerald-600',
            },
            {
              label: 'Pendientes de cierre',
              value: dashboard.data?.horometros.pendientes_cierre ?? 0,
              icon: <Clock3 className="h-6 w-6 text-amber-700" aria-hidden="true" />,
              tone: 'bg-amber-50',
              bar: 'bg-amber-600',
            },
            {
              label: 'Completos',
              value: dashboard.data?.horometros.completos ?? 0,
              icon: <CheckCircle2 className="h-6 w-6 text-blue-700" aria-hidden="true" />,
              tone: 'bg-blue-50',
              bar: 'bg-blue-600',
            },
            {
              label: 'Observados',
              value: dashboard.data?.horometros.observados ?? 0,
              icon: <Eye className="h-6 w-6 text-rose-700" aria-hidden="true" />,
              tone: 'bg-rose-50',
              bar: 'bg-rose-600',
            },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-slate-600" aria-hidden="true" />
              <h2 className="text-lg font-black text-slate-950">Actividad semanal</h2>
            </div>
            <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600">Esta semana</span>
          </div>
          <div className="flex h-64 items-end gap-7 border-b border-slate-100 px-4">
            {weekBars.map((bar) => (
              <div key={bar.day} className="grid flex-1 justify-items-center gap-2">
                <span className="text-xs font-bold text-slate-500">{bar.value}</span>
                <div className="w-9 rounded-t-lg bg-emerald-600 shadow-inner" style={{ height: `${bar.value * 2}px` }} />
                <span className="text-sm font-medium text-slate-500">{bar.day}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center gap-2 text-sm font-medium text-slate-600">
            <span className="mt-1 h-3 w-3 rounded-full bg-emerald-600" />
            Registros
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-slate-600" aria-hidden="true" />
              <h2 className="text-lg font-black text-slate-950">Alertas</h2>
            </div>
            <span className="text-sm font-bold text-emerald-700">Ver todas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[620px] w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="py-3">Fecha</th>
                  <th className="py-3">Tipo</th>
                  <th className="py-3">Descripción</th>
                  <th className="py-3">Entidad</th>
                  <th className="py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ['Hoy', '!', 'Horómetro sin cierre', 'Tractor 03', 'Alta'],
                  ['Hoy', '⏱', 'OT pendiente por vencer', 'OT-1287', 'Media'],
                  ['Hoy', 'i', 'Repuesto próximo a agotarse', 'Filtro de aceite', 'Baja'],
                  ['Hoy', '!', 'Inconsistencia en lectura', 'Cosechadora 02', 'Alta'],
                ].map(([date, type, description, entity, state]) => (
                  <tr key={`${description}-${entity}`}>
                    <td className="py-3 text-slate-500">{date}</td>
                    <td className="py-3 font-black text-rose-600">{type}</td>
                    <td className="py-3 font-medium text-slate-700">{description}</td>
                    <td className="py-3 text-slate-600">{entity}</td>
                    <td className="py-3">
                      <span className={state === 'Alta' ? 'rounded-md bg-rose-50 px-3 py-1 font-bold text-rose-700' : state === 'Media' ? 'rounded-md bg-amber-50 px-3 py-1 font-bold text-amber-700' : 'rounded-md bg-emerald-50 px-3 py-1 font-bold text-emerald-700'}>
                        {state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {dashboard.isError ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          No se pudo actualizar la información del API.
        </div>
      ) : null}
    </AppLayout>
  )
}

function ModulePanel({
  title,
  icon,
  to,
  items,
}: {
  title: string
  icon: ReactElement
  to: string
  items: Array<{ label: string; value: number; icon: ReactElement; tone: string; bar: string }>
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="mb-7 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">{icon}</div>
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
        </div>
        <Link className="text-sm font-bold text-emerald-700 hover:text-emerald-800" to={to}>
          Ver detalle ›
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="grid min-h-36 justify-items-center border-r border-slate-100 px-3 text-center last:border-r-0">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full ${item.tone}`}>{item.icon}</div>
            <div className="text-3xl font-black text-slate-950">{item.value}</div>
            <div className="text-sm font-medium text-slate-500">{item.label}</div>
            <div className={`mt-2 h-1 w-24 rounded-full ${item.bar}`} />
          </div>
        ))}
      </div>
    </section>
  )
}
