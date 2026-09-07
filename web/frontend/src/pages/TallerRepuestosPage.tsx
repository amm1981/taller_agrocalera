import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ClipboardCheck, ClipboardList, Download, MoreVertical, PackageCheck, RefreshCw, Save, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { MetricCard } from '../components/common/MetricCard'
import { getTecnicos } from '../features/maestros/masterDataService'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import { StatusBadge } from '../features/taller/components/StatusBadge'
import {
  formatDateTime,
  orderNumber,
  personName,
  vehicleName,
} from '../features/taller/components/tallerFormatters'
import {
  confirmarRecojoRepuesto,
  getRepuestos,
  marcarRepuestoDisponible,
  updateRepuesto,
} from '../features/taller/tallerService'
import type { RepuestoFilters, SolicitudRepuesto } from '../features/taller/types'
import { AppLayout } from '../layouts/AppLayout'
import { cn } from '../utils/cn'

const repuestoStates = ['SOLICITADO', 'DISPONIBLE', 'ENTREGADO']

function requestCode(repuesto: SolicitudRepuesto) {
  return `R-${String(repuesto.id).padStart(6, '0')}`
}

export function TallerRepuestosPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<RepuestoFilters>({ per_page: 30 })
  const [selected, setSelected] = useState<SolicitudRepuesto | null>(null)
  const [form, setForm] = useState({ codigoSap: '', descripcionSap: '', cantidad: '1' })
  const repuestos = useQuery({
    queryKey: ['taller-repuestos', filters],
    queryFn: () => getRepuestos(filters),
  })
  const tecnicos = useQuery({ queryKey: ['tecnicos'], queryFn: getTecnicos })

  const counts = useMemo(() => {
    const rows = repuestos.data?.data ?? []

    return {
      solicitados: rows.filter((item) => item.estado === 'SOLICITADO').length,
      disponibles: rows.filter((item) => item.estado === 'DISPONIBLE').length,
      entregados: rows.filter((item) => item.estado === 'ENTREGADO').length,
    }
  }, [repuestos.data?.data])

  useEffect(() => {
    const rows = repuestos.data?.data ?? []
    const stillVisible = selected && rows.some((item) => item.id === selected.id)

    if (!stillVisible) {
      setSelected(rows[0] ?? null)
    }
  }, [repuestos.data?.data, selected])

  useEffect(() => {
    setForm({
      codigoSap: selected?.codigo_sap ?? '',
      descripcionSap: selected?.descripcion_sap ?? '',
      cantidad: String(selected?.cantidad ?? '1'),
    })
  }, [selected])

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['taller-repuestos'] })
    await queryClient.invalidateQueries({ queryKey: ['taller-dashboard'] })
  }

  const save = useMutation({
    mutationFn: () => {
      if (!selected) {
        throw new Error('No hay repuesto seleccionado')
      }

      return updateRepuesto(selected.id, {
        descripcion_solicitada: selected.descripcion_solicitada,
        codigo_sap: form.codigoSap || null,
        descripcion_sap: form.descripcionSap || null,
        cantidad: form.cantidad,
        observacion: selected.observacion,
      })
    },
    onSuccess: invalidate,
  })
  const markAvailable = useMutation({
    mutationFn: () => {
      if (!selected) {
        throw new Error('No hay repuesto seleccionado')
      }

      return marcarRepuestoDisponible(selected.id)
    },
    onSuccess: invalidate,
  })
  const confirmPickup = useMutation({
    mutationFn: () => {
      if (!selected) {
        throw new Error('No hay repuesto seleccionado')
      }

      return confirmarRecojoRepuesto(selected.id)
    },
    onSuccess: invalidate,
  })

  const updateFilter = (key: keyof RepuestoFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }))
  }

  return (
    <AppLayout title="Taller · Repuestos" description="Solicitudes, disponibilidad y entrega de repuestos">
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_180px]">
          <FilterField label="Estado">
            <select className={inputClass} value={filters.estado ?? ''} onChange={(event) => updateFilter('estado', event.target.value)}>
              <option value="">Todos</option>
              {repuestoStates.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Fecha">
            <input className={inputClass} type="date" value={filters.fecha_desde ?? ''} onChange={(event) => updateFilter('fecha_desde', event.target.value)} />
          </FilterField>
          <FilterField label="Técnico">
            <select className={inputClass} value={filters.tecnico_id ?? ''} onChange={(event) => updateFilter('tecnico_id', event.target.value)}>
              <option value="">Todos</option>
              {(tecnicos.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.nombres} {item.apellidos}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="OT">
            <input
              className={inputClass}
              inputMode="numeric"
              value={filters.orden_trabajo_id ?? ''}
              onChange={(event) => updateFilter('orden_trabajo_id', event.target.value)}
              placeholder="Buscar OT..."
            />
          </FilterField>
          <div className="flex items-end gap-2">
            <Button variant="secondary" onClick={() => setFilters({ per_page: 30 })}>Limpiar</Button>
            <Button variant="ghost" onClick={() => void repuestos.refetch()} disabled={repuestos.isFetching} aria-label="Actualizar repuestos">
              <RefreshCw className={`h-4 w-4 ${repuestos.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>

      <div className="mb-6 grid gap-5 md:grid-cols-3">
        <MetricCard label="Solicitados" value={counts.solicitados} icon={<ClipboardList className="h-7 w-7" aria-hidden="true" />} tone="green" delta="+ 8%" />
        <MetricCard label="Disponibles" value={counts.disponibles} icon={<PackageCheck className="h-7 w-7" aria-hidden="true" />} tone="blue" delta="+ 6%" />
        <MetricCard label="Entregados" value={counts.entregados} icon={<Truck className="h-7 w-7" aria-hidden="true" />} tone="orange" delta="+ 12%" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
            <thead className="bg-white text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-100 px-5 py-4">Solicitud</th>
                <th className="border-b border-slate-100 px-5 py-4">OT</th>
                <th className="border-b border-slate-100 px-5 py-4">Equipo</th>
                <th className="border-b border-slate-100 px-5 py-4">Técnico</th>
                <th className="border-b border-slate-100 px-5 py-4">Repuesto solicitado</th>
                <th className="border-b border-slate-100 px-5 py-4">Código SAP</th>
                <th className="border-b border-slate-100 px-5 py-4">Cantidad</th>
                <th className="border-b border-slate-100 px-5 py-4">Estado</th>
                <th className="border-b border-slate-100 px-5 py-4">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(repuestos.data?.data ?? []).map((item) => (
                <tr
                  key={item.id}
                  className={cn('cursor-pointer hover:bg-slate-50', selected?.id === item.id ? 'bg-emerald-50/50 ring-1 ring-inset ring-emerald-100' : '')}
                  onClick={() => setSelected(item)}
                >
                  <td className="px-5 py-4 align-top font-bold text-slate-950">{requestCode(item)}</td>
                  <td className="px-5 py-4 align-top font-medium text-slate-700">{orderNumber(item.orden_trabajo)}</td>
                  <td className="px-5 py-4 align-top text-slate-700">
                    {item.orden_trabajo?.vehiculo?.id ? (
                      <Link
                        className="font-semibold text-slate-950 hover:text-emerald-700"
                        to={`/vehiculos/${item.orden_trabajo.vehiculo.id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {vehicleName(item.orden_trabajo.vehiculo)}
                      </Link>
                    ) : (
                      vehicleName(item.orden_trabajo?.vehiculo)
                    )}
                  </td>
                  <td className="px-5 py-4 align-top text-slate-700">{personName(item.tecnico)}</td>
                  <td className="px-5 py-4 align-top">
                    <div className="font-medium text-slate-900">{item.descripcion_solicitada}</div>
                    <div className="mt-1 text-xs font-medium text-slate-500">{formatDateTime(item.fecha_solicitud)}</div>
                  </td>
                  <td className="px-5 py-4 align-top text-slate-700">{item.codigo_sap ?? '-'}</td>
                  <td className="px-5 py-4 align-top font-bold text-slate-900">{item.cantidad}</td>
                  <td className="px-5 py-4 align-top"><StatusBadge value={item.estado} /></td>
                  <td className="px-5 py-4 align-top">
                    <MoreVertical className="h-5 w-5 text-slate-500" aria-hidden="true" />
                  </td>
                </tr>
              ))}
              {!repuestos.isLoading && !repuestos.data?.data.length ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm font-medium text-slate-500">
                    No hay solicitudes de repuesto con esos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">Editar repuesto solicitado</h2>
          <span className="text-sm font-bold text-slate-500">{selected ? requestCode(selected) : 'Sin selección'}</span>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr_1fr_220px_220px]">
          <FilterField label="Código SAP">
            <input className={inputClass} value={form.codigoSap} onChange={(event) => setForm((current) => ({ ...current, codigoSap: event.target.value }))} disabled={!selected} />
          </FilterField>
          <FilterField label="Descripción">
            <input className={inputClass} value={form.descripcionSap} onChange={(event) => setForm((current) => ({ ...current, descripcionSap: event.target.value }))} disabled={!selected} />
          </FilterField>
          <FilterField label="Cantidad">
            <input className={inputClass} inputMode="decimal" value={form.cantidad} onChange={(event) => setForm((current) => ({ ...current, cantidad: event.target.value }))} disabled={!selected} />
          </FilterField>
          <div className="flex items-end">
            <Button className="w-full" variant="secondary" onClick={() => save.mutate()} disabled={!selected || save.isPending}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Guardar
            </Button>
          </div>
          <div className="flex items-end">
            {selected?.estado === 'DISPONIBLE' ? (
              <Button className="w-full" onClick={() => confirmPickup.mutate()} disabled={confirmPickup.isPending}>
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                Confirmar recojo
              </Button>
            ) : (
              <Button className="w-full" onClick={() => markAvailable.mutate()} disabled={!selected || selected.estado !== 'SOLICITADO' || markAvailable.isPending}>
                <Check className="h-4 w-4" aria-hidden="true" />
                Marcar disponible
              </Button>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
          <Download className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          Última actualización: {selected ? formatDateTime(selected.fecha_solicitud) : '-'}
        </div>
      </section>
    </AppLayout>
  )
}
