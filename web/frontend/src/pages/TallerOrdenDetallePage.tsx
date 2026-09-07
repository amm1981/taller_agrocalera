import { useQuery } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { ArrowLeft, CalendarClock, ClipboardList, Gauge, Leaf, PackageCheck, Tractor, UserRound, Wrench } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../features/taller/components/StatusBadge'
import {
  formatDateTime,
  orderNumber,
  personName,
  vehicleName,
} from '../features/taller/components/tallerFormatters'
import { getOrden } from '../features/taller/tallerService'
import { AppLayout } from '../layouts/AppLayout'

export function TallerOrdenDetallePage() {
  const { id } = useParams()
  const order = useQuery({
    queryKey: ['taller-orden', id],
    queryFn: () => getOrden(id ?? ''),
    enabled: Boolean(id),
  })

  const data = order.data

  return (
    <AppLayout title="Taller · Detalle de OT" description={data ? `Detalle de ${orderNumber(data)}` : 'Diagnóstico, repuestos y trazabilidad'}>
      <Link className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800" to="/taller/ordenes">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a órdenes
      </Link>

      {order.isError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No se pudo cargar la orden seleccionada.
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <SummaryCard icon={<Tractor className="h-6 w-6 text-emerald-700" />} label="Equipo" value={vehicleName(data.vehiculo)} />
            <SummaryCard icon={<Leaf className="h-6 w-6 text-emerald-700" />} label="Gerencia" value={data.gerencia?.nombre ?? '-'} />
            <SummaryCard icon={<Wrench className="h-6 w-6 text-orange-700" />} label="Tipo de falla" value={data.tipo_falla?.nombre ?? '-'} />
            <SummaryCard icon={<Gauge className="h-6 w-6 text-blue-700" />} label="Estado" value={<StatusBadge value={data.estado} />} />
            <SummaryCard icon={<Wrench className="h-6 w-6 text-violet-700" />} label="Tipo atención" value={data.tipo_atencion ?? '-'} />
            <SummaryCard icon={<UserRound className="h-6 w-6 text-emerald-700" />} label="Técnico" value={personName(data.tecnico)} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <SectionTitle icon={<ClipboardList className="h-5 w-5 text-emerald-700" />} title="Detalle reportado" />
              <div className="mt-5 grid gap-4">
                <Detail label="Fecha y hora" value={formatDateTime(data.fecha_reporte)} />
                <Detail label="Reportado por" value={personName(data.reportado_por)} />
                <TextBlock label="Descripción" value={data.detalle_reporte} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <SectionTitle icon={<Gauge className="h-5 w-5 text-emerald-700" />} title="Estado del equipo" />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="flex h-14 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-sm font-black text-emerald-800">{data.estado_equipo.replaceAll('_', ' ')}</div>
                <div className="flex h-14 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-500">Seguimiento activo</div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <SectionTitle icon={<Wrench className="h-5 w-5 text-emerald-700" />} title="Diagnóstico técnico" />
              <div className="mt-5 grid gap-4">
              <TextBlock label="Detalle reportado" value={data.detalle_reporte} />
              <TextBlock label="Diagnóstico" value={data.diagnostico} />
              <TextBlock label="Trabajo realizado" value={data.trabajo_realizado} />
              <TextBlock label="Pendiente" value={data.trabajo_pendiente} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <SectionTitle icon={<CalendarClock className="h-5 w-5 text-emerald-700" />} title="Trazabilidad" />
              <ol className="mt-5 space-y-4">
                {(data.eventos ?? []).map((event) => (
                  <li key={event.id} className="relative pl-8 text-sm before:absolute before:left-2 before:top-2 before:h-full before:w-px before:bg-emerald-100 last:before:hidden">
                    <span className="absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-emerald-700 bg-white" />
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black text-slate-900">{event.tipo_evento.replaceAll('_', ' ')}</span>
                      <span className="text-xs font-medium text-slate-500">{formatDateTime(event.created_at)}</span>
                    </div>
                    <p className="mt-1 text-slate-600">{event.descripcion ?? 'Sin descripción'}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{event.usuario?.name ?? 'Sistema'}</p>
                  </li>
                ))}
                {!data.eventos?.length ? (
                  <li className="py-8 text-center text-sm text-slate-500">Sin eventos registrados.</li>
                ) : null}
              </ol>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)] xl:col-span-2">
              <SectionTitle icon={<PackageCheck className="h-5 w-5 text-emerald-700" />} title="Repuestos solicitados" />
              <ul className="divide-y divide-slate-100">
                {(data.repuestos ?? []).map((item) => (
                  <li key={item.id} className="grid gap-2 px-4 py-3 text-sm">
                    <div className="font-medium text-slate-900">{item.descripcion_solicitada}</div>
                    <div className="flex flex-wrap items-center gap-2 text-slate-500">
                      <StatusBadge value={item.estado} />
                      <span>Cant. {item.cantidad}</span>
                    </div>
                  </li>
                ))}
                {!data.repuestos?.length ? (
                  <li className="px-4 py-8 text-center text-sm text-slate-500">Sin repuestos solicitados.</li>
                ) : null}
              </ul>
            </section>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
          Cargando orden...
        </div>
      )}
    </AppLayout>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  )
}

function SummaryCard({ icon, label, value }: { icon: ReactElement; label: string; value: string | ReactElement }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">{icon}</div>
        <div>
          <div className="text-xs font-bold text-slate-500">{label}</div>
          <div className="mt-1 text-sm font-black text-slate-950">{value}</div>
        </div>
      </div>
    </section>
  )
}

function SectionTitle({ icon, title }: { icon: ReactElement; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">{icon}</div>
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
    </div>
  )
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
        <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="min-h-12 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {value || 'Sin información registrada.'}
      </p>
    </div>
  )
}
