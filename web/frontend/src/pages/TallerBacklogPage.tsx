import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { StatusBadge } from '../features/taller/components/StatusBadge'
import {
  daysSince,
  formatDateTime,
  orderNumber,
  personName,
  vehicleName,
} from '../features/taller/components/tallerFormatters'
import { getBacklog, resolverBacklog } from '../features/taller/tallerService'
import { AppLayout } from '../layouts/AppLayout'

export function TallerBacklogPage() {
  const queryClient = useQueryClient()
  const backlog = useQuery({
    queryKey: ['taller-backlog'],
    queryFn: () => getBacklog(),
  })
  const resolve = useMutation({
    mutationFn: resolverBacklog,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['taller-backlog'] })
      await queryClient.invalidateQueries({ queryKey: ['taller-dashboard'] })
    },
  })

  return (
    <AppLayout title="Taller · Backlog" description="Trabajos finalizados con pendientes por resolver">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">Pendientes activos</h2>
          <Button variant="secondary" onClick={() => void backlog.refetch()} disabled={backlog.isFetching}>
            <RefreshCw className={`h-4 w-4 ${backlog.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
            Actualizar
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
            <thead className="bg-white text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-100 px-5 py-4">OT</th>
                <th className="border-b border-slate-100 px-5 py-4">Equipo</th>
                <th className="border-b border-slate-100 px-5 py-4">Gerencia</th>
                <th className="border-b border-slate-100 px-5 py-4">Falla</th>
                <th className="border-b border-slate-100 px-5 py-4">Pendiente</th>
                <th className="border-b border-slate-100 px-5 py-4">Técnico</th>
                <th className="border-b border-slate-100 px-5 py-4">Fecha</th>
                <th className="border-b border-slate-100 px-5 py-4">Antigüedad</th>
                <th className="border-b border-slate-100 px-5 py-4">Estado equipo</th>
                <th className="border-b border-slate-100 px-5 py-4">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(backlog.data?.data ?? []).map((order) => (
                <tr key={order.id} className="hover:bg-emerald-50/25">
                  <td className="px-5 py-4 align-top font-black text-slate-950">{orderNumber(order)}</td>
                  <td className="px-5 py-4 align-top text-slate-700">
                    {order.vehiculo?.id ? (
                      <Link className="font-semibold text-slate-950 hover:text-emerald-700" to={`/vehiculos/${order.vehiculo.id}`}>
                        {vehicleName(order.vehiculo)}
                      </Link>
                    ) : (
                      vehicleName(order.vehiculo)
                    )}
                  </td>
                  <td className="px-5 py-4 align-top text-slate-700">{order.gerencia?.nombre ?? '-'}</td>
                  <td className="px-5 py-4 align-top text-slate-700">{order.tipo_falla?.nombre ?? '-'}</td>
                  <td className="max-w-[280px] px-5 py-4 align-top text-slate-700">{order.trabajo_pendiente || '-'}</td>
                  <td className="px-5 py-4 align-top text-slate-700">{personName(order.tecnico)}</td>
                  <td className="px-5 py-4 align-top text-slate-500">{formatDateTime(order.fecha_pendiente)}</td>
                  <td className="px-5 py-4 align-top font-black text-slate-900">{daysSince(order.fecha_pendiente)} días</td>
                  <td className="px-5 py-4 align-top"><StatusBadge value={order.estado_equipo} /></td>
                  <td className="px-5 py-4 align-top">
                    <Button variant="secondary" onClick={() => resolve.mutate(order.id)} disabled={resolve.isPending}>
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Resolver
                    </Button>
                  </td>
                </tr>
              ))}
              {!backlog.isLoading && !backlog.data?.data.length ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-sm font-medium text-slate-500">
                    No hay trabajos pendientes en backlog.
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
