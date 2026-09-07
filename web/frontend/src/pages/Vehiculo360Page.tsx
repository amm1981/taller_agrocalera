import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Gauge,
  MapPin,
  PackageCheck,
  TimerReset,
  Tractor,
  Wrench,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { MetricCard } from '../components/common/MetricCard'
import { StatusBadge } from '../features/taller/components/StatusBadge'
import {
  formatDate,
  formatDateTime,
  orderNumber,
  personName,
  vehicleName,
} from '../features/taller/components/tallerFormatters'
import { getVehiculo360 } from '../features/vehiculos/vehiculosService'
import type { Vehiculo360Alerta } from '../features/vehiculos/types'
import { cn } from '../utils/cn'

const alertTone: Record<Vehiculo360Alerta['nivel'], string> = {
  critico: 'border-rose-200 bg-rose-50 text-rose-900',
  advertencia: 'border-amber-200 bg-amber-50 text-amber-950',
  info: 'border-blue-200 bg-blue-50 text-blue-950',
}

function numberValue(value: string | number | null | undefined, suffix = '') {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  const numeric = Number(value)

  if (Number.isNaN(numeric)) {
    return `${value}${suffix}`
  }

  return `${numeric.toLocaleString('es-PE', { maximumFractionDigits: 1 })}${suffix}`
}

export function Vehiculo360Page() {
  const { id } = useParams()

  const traceability = useQuery({
    queryKey: ['vehiculo-360', id],
    queryFn: () => getVehiculo360(id ?? ''),
    enabled: Boolean(id),
  })

  const data = traceability.data
  const vehicle = data?.vehiculo
  const metrics = data?.metricas

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        to="/maestros"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a maestros
      </Link>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="grid gap-5 border-b border-slate-100 bg-slate-50/80 p-6 lg:grid-cols-[1fr_320px]">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Tractor className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-wide text-emerald-700">
                Ficha 360 del vehículo
              </div>
              <h1 className="mt-1 text-3xl font-black text-slate-950">
                {vehicle ? vehicleName(vehicle) : 'Cargando vehículo...'}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                  {vehicle?.tipo_vehiculo?.nombre ?? 'Tipo no definido'}
                </span>
                <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                  Placa {vehicle?.placa ?? 'sin placa'}
                </span>
                <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                  {vehicle?.marca ?? 'Marca'} {vehicle?.modelo ?? ''}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-500">Estado operativo</span>
              {vehicle?.estado ? <StatusBadge value={vehicle.estado} /> : <span>-</span>}
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-700">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Ubicación
              </span>
              <span className="font-bold text-slate-950">{vehicle?.sede?.nombre ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-700">
              <span className="inline-flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Último registro
              </span>
              <span className="font-bold text-slate-950">
                {formatDate(metrics?.ultimo_registro_fecha)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Horómetro actual"
            value={numberValue(metrics?.horometro_actual)}
            icon={<Gauge className="h-7 w-7" aria-hidden="true" />}
            tone="green"
            delta={numberValue(metrics?.horas_ultimos_30_dias, ' h')}
            trend="últimos 30 días"
          />
          <MetricCard
            label="Horas acumuladas"
            value={numberValue(metrics?.horas_totales, ' h')}
            icon={<Activity className="h-7 w-7" aria-hidden="true" />}
            tone="blue"
            delta={`${metrics?.registros_completos ?? 0}`}
            trend="registros completos"
          />
          <MetricCard
            label="OT abiertas"
            value={metrics?.ordenes_abiertas ?? 0}
            icon={<Wrench className="h-7 w-7" aria-hidden="true" />}
            tone="amber"
            delta={`${metrics?.ordenes_ultimos_30_dias ?? 0}`}
            trend="OT últimos 30 días"
          />
          <MetricCard
            label="Repuestos pendientes"
            value={metrics?.repuestos_pendientes ?? 0}
            icon={<PackageCheck className="h-7 w-7" aria-hidden="true" />}
            tone="orange"
            delta={`${metrics?.registros_observados ?? 0}`}
            trend="lecturas por validar"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">Mantenimiento preventivo</h2>
            <p className="text-sm text-slate-500">Planes activos según el horómetro actual</p>
          </div>
          <div className="flex items-center gap-3">
            {data?.mantenimiento_preventivo?.estado ? (
              <StatusBadge value={data.mantenimiento_preventivo.estado} />
            ) : null}
            <Link className="text-sm font-bold text-emerald-700 hover:text-emerald-800" to="/taller/preventivo">
              Ver plan general ›
            </Link>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {(data?.mantenimiento_preventivo?.planes ?? []).map((plan) => (
            <div key={plan.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-black text-slate-950">{plan.nombre}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{plan.descripcion ?? 'Plan preventivo'}</div>
                </div>
                <StatusBadge value={plan.estado} />
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className={cn(
                    'h-full rounded-full',
                    plan.estado === 'VENCIDO'
                      ? 'bg-rose-600'
                      : plan.estado === 'PROXIMO'
                        ? 'bg-amber-500'
                        : 'bg-emerald-600',
                  )}
                  style={{ width: `${Math.min(100, plan.porcentaje_ciclo)}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <MiniStat label="Intervalo" value={numberValue(plan.intervalo_horas, ' h')} />
                <MiniStat label="Próximo" value={numberValue(plan.proximo_servicio_horas, ' h')} />
                <MiniStat label="Restante" value={numberValue(plan.horas_restantes, ' h')} />
              </div>
            </div>
          ))}
          {!traceability.isLoading && !data?.mantenimiento_preventivo?.planes.length ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No hay planes preventivos configurados para este tipo de vehículo.
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Alertas cruzadas</h2>
              <p className="text-sm text-slate-500">Taller, horómetros y repuestos</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
          </div>

          <div className="space-y-3">
            {(data?.alertas ?? []).map((alerta) => (
              <div
                key={`${alerta.tipo}-${alerta.titulo}`}
                className={cn('rounded-xl border p-4 text-sm', alertTone[alerta.nivel])}
              >
                <div className="font-black">{alerta.titulo}</div>
                <div className="mt-1 leading-6 opacity-80">{alerta.detalle}</div>
              </div>
            ))}
            {!traceability.isLoading && !data?.alertas.length ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="font-black">Sin alertas activas</div>
                <div className="mt-1 leading-6 opacity-80">El equipo no presenta cruces pendientes.</div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Ordenes recientes</h2>
              <p className="text-sm text-slate-500">Historial de mantenimiento y pendientes</p>
            </div>
            <ClipboardList className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">OT</th>
                  <th className="px-5 py-3">Falla</th>
                  <th className="px-5 py-3">Técnico</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.ordenes_recientes ?? []).map((orden) => (
                  <tr key={orden.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-black text-slate-950">
                      <Link className="hover:text-emerald-700" to={`/taller/ordenes/${orden.id}`}>
                        {orderNumber(orden)}
                      </Link>
                    </td>
                    <td className="max-w-[340px] px-5 py-4 text-slate-700">
                      <div className="font-semibold text-slate-900">{orden.tipo_falla?.nombre ?? '-'}</div>
                      <div className="truncate text-xs text-slate-500">{orden.detalle_reporte}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{personName(orden.tecnico)}</td>
                    <td className="px-5 py-4"><StatusBadge value={orden.estado} /></td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(orden.fecha_reporte)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!traceability.isLoading && !data?.ordenes_recientes.length ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">
              Este vehículo todavía no tiene órdenes de trabajo.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">Registros de horómetro</h2>
            <p className="text-sm text-slate-500">Últimas lecturas, horas trabajadas y evidencia</p>
          </div>
          <TimerReset className="h-5 w-5 text-blue-700" aria-hidden="true" />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Operario</th>
                <th className="px-5 py-3">Inicial</th>
                <th className="px-5 py-3">Final</th>
                <th className="px-5 py-3">Horas</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.registros_recientes ?? []).map((registro) => (
                <tr key={registro.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-semibold text-slate-950">{formatDate(registro.fecha)}</td>
                  <td className="px-5 py-4 text-slate-700">{personName(registro.operario)}</td>
                  <td className="px-5 py-4 font-semibold text-slate-700">
                    {numberValue(registro.horometro_inicial_confirmado)}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-700">
                    {numberValue(registro.horometro_final_confirmado)}
                  </td>
                  <td className="px-5 py-4 font-black text-slate-950">
                    {numberValue(registro.horas_trabajadas, ' h')}
                  </td>
                  <td className="px-5 py-4"><StatusBadge value={registro.estado} /></td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    <div>Inicio: {formatDateTime(registro.fecha_hora_inicio)}</div>
                    <div>Cierre: {formatDateTime(registro.fecha_hora_final)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!traceability.isLoading && !data?.registros_recientes.length ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            Este vehículo todavía no tiene lecturas de horómetro.
          </div>
        ) : null}
      </section>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-bold text-slate-400">{label}</div>
      <div className="mt-1 font-black text-slate-950">{value}</div>
    </div>
  )
}
