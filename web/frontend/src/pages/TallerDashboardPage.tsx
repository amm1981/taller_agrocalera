import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ClipboardList, PackageCheck, TimerReset, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MetricCard } from '../components/common/MetricCard'
import { formatDateTime, orderNumber, vehicleName } from '../features/taller/components/tallerFormatters'
import { getOrdenes, getTallerDashboard } from '../features/taller/tallerService'
import { AppLayout } from '../layouts/AppLayout'

export function TallerDashboardPage() {
  const dashboard = useQuery({
    queryKey: ['taller-dashboard'],
    queryFn: getTallerDashboard,
  })
  const recentOrders = useQuery({
    queryKey: ['taller-ordenes-recientes'],
    queryFn: () => getOrdenes({ per_page: 8 }),
  })

  return (
    <AppLayout title="Taller" description="Órdenes, repuestos, backlog y reportes operativos">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pendientes" value={dashboard.data?.ordenes.pendientes ?? 0} icon={<ClipboardList className="h-7 w-7" aria-hidden="true" />} tone="amber" delta="+ 5%" />
        <MetricCard label="En curso" value={dashboard.data?.ordenes.en_curso ?? 0} icon={<Wrench className="h-7 w-7" aria-hidden="true" />} tone="green" delta="+ 4%" />
        <MetricCard label="Esperando repuesto" value={dashboard.data?.ordenes.esperando_repuesto ?? 0} icon={<PackageCheck className="h-7 w-7" aria-hidden="true" />} tone="orange" delta="+ 2%" />
        <MetricCard label="Backlog" value={dashboard.data?.ordenes.backlog ?? 0} icon={<TimerReset className="h-7 w-7" aria-hidden="true" />} tone="purple" delta="+ 1%" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <PackageCheck className="h-5 w-5 text-slate-600" aria-hidden="true" />
              <h2 className="text-lg font-black text-slate-950">Repuestos</h2>
            </div>
            <Link className="text-sm font-bold text-emerald-700 hover:text-emerald-800" to="/taller/repuestos">
              Ver detalle ›
            </Link>
          </div>
          <div className="grid gap-3">
            <SoftRow label="Solicitados" value={dashboard.data?.repuestos.solicitados ?? 0} />
            <SoftRow label="Disponibles" value={dashboard.data?.repuestos.disponibles ?? 0} positive />
            <SoftRow label="Entregados" value={dashboard.data?.repuestos.entregados ?? 0} />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link className="inline-flex h-12 items-center justify-center rounded-lg border border-emerald-200 bg-white px-4 text-sm font-black text-emerald-800 hover:bg-emerald-50" to="/taller/backlog">
              Ver backlog
            </Link>
            <Link className="inline-flex h-12 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800" to="/taller/reportes">
              Ver reportes
            </Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-black text-slate-950">Órdenes recientes</h2>
            <Link className="text-sm font-bold text-emerald-700 hover:text-emerald-800" to="/taller/ordenes">
              Ver todas ›
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="border-b border-slate-100 px-5 py-4">OT</th>
                  <th className="border-b border-slate-100 px-5 py-4">Equipo</th>
                  <th className="border-b border-slate-100 px-5 py-4">Fecha</th>
                  <th className="border-b border-slate-100 px-5 py-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(recentOrders.data?.data ?? []).map((order) => (
                  <tr key={order.id} className="hover:bg-emerald-50/25">
                    <td className="px-5 py-4">
                      <Link className="font-black text-slate-950 hover:text-emerald-700" to={`/taller/ordenes/${order.id}`}>
                        {orderNumber(order)}
                      </Link>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-700">
                      {order.vehiculo?.id ? (
                        <Link className="hover:text-emerald-700" to={`/vehiculos/${order.vehiculo.id}`}>
                          {vehicleName(order.vehiculo)}
                        </Link>
                      ) : (
                        vehicleName(order.vehiculo)
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDateTime(order.fecha_reporte)}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1 font-bold text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                        {order.estado.replaceAll('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {!recentOrders.isLoading && !recentOrders.data?.data.length ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm font-medium text-slate-500">Sin órdenes registradas.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}

function SoftRow({ label, value, positive = false }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className={positive ? 'flex h-12 items-center justify-between rounded-xl bg-emerald-50 px-4 text-emerald-800' : 'flex h-12 items-center justify-between rounded-xl bg-slate-50 px-4 text-slate-700'}>
      <span className="text-sm font-bold">{label}</span>
      <strong className="text-lg text-slate-950">{value}</strong>
    </div>
  )
}
