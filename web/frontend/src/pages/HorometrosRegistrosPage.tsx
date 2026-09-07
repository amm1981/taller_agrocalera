import { useMutation, useQuery } from '@tanstack/react-query'
import { Camera, Download, Eye, RefreshCw, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { getOperarios, getVehiculos } from '../features/maestros/masterDataService'
import {
  getFundosMaster,
  getLotesMaster,
  getSedesMaster,
  getTiposVehiculoMaster,
} from '../features/maestros/maestrosService'
import { exportHorometroRegistros, getHorometroRegistros } from '../features/horometros/horometrosService'
import type { HorometroFilters, HorometroRegistro } from '../features/horometros/types'
import { StatusBadge } from '../features/taller/components/StatusBadge'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import { formatDateTime, personName, vehicleName } from '../features/taller/components/tallerFormatters'
import { getUsuarios } from '../features/usuarios/usuariosService'
import { AppLayout } from '../layouts/AppLayout'

const estados = ['PENDIENTE_INICIO', 'EN_JORNADA', 'COMPLETO', 'SIN_INICIO', 'SIN_CIERRE', 'INCONSISTENCIA', 'REGULARIZADO', 'OBSERVADO', 'ANULADO']

export function HorometrosRegistrosPage() {
  const [filters, setFilters] = useState<HorometroFilters>({ per_page: 30 })
  const [selected, setSelected] = useState<HorometroRegistro | null>(null)
  const registros = useQuery({
    queryKey: ['horometros-registros', filters],
    queryFn: () => getHorometroRegistros(filters),
  })
  const vehiculos = useQuery({ queryKey: ['vehiculos'], queryFn: getVehiculos })
  const operarios = useQuery({ queryKey: ['operarios'], queryFn: getOperarios })
  const usuarios = useQuery({ queryKey: ['usuarios-lookup'], queryFn: () => getUsuarios({ per_page: 100 }) })
  const sedes = useQuery({ queryKey: ['maestros-sedes-lookup'], queryFn: getSedesMaster })
  const fundos = useQuery({ queryKey: ['maestros-fundos-lookup'], queryFn: getFundosMaster })
  const lotes = useQuery({ queryKey: ['maestros-lotes-lookup'], queryFn: getLotesMaster })
  const tiposVehiculo = useQuery({ queryKey: ['tipos-vehiculo'], queryFn: getTiposVehiculoMaster })
  const exportMutation = useMutation({
    mutationFn: () => exportHorometroRegistros(filters),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `horometros-registros-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
  })

  const updateFilter = (key: keyof HorometroFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value || undefined, page: 1 }))
  }

  return (
    <AppLayout title="Horómetros · Registros" description="Auditoría por fechas, ubicación, vehículo, personal y evidencia">
      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <FilterField label="Fecha desde">
            <input className={inputClass} type="date" value={filters.fecha_desde ?? ''} onChange={(event) => updateFilter('fecha_desde', event.target.value)} />
          </FilterField>
          <FilterField label="Fecha hasta">
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
          <FilterField label="Conductor / operario">
            <select className={inputClass} value={filters.operario_id ?? ''} onChange={(event) => updateFilter('operario_id', event.target.value)}>
              <option value="">Todos</option>
              {(operarios.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.dni} - {item.nombres} {item.apellidos}</option>)}
            </select>
          </FilterField>
          <FilterField label="Responsable">
            <select className={inputClass} value={filters.usuario_responsable_id ?? ''} onChange={(event) => updateFilter('usuario_responsable_id', event.target.value)}>
              <option value="">Todos</option>
              {(usuarios.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} {item.last_name ?? ''}</option>)}
            </select>
          </FilterField>
          <FilterField label="Estado">
            <select className={inputClass} value={filters.estado ?? ''} onChange={(event) => updateFilter('estado', event.target.value)}>
              <option value="">Todos</option>
              {estados.map((estado) => <option key={estado} value={estado}>{estado.replaceAll('_', ' ')}</option>)}
            </select>
          </FilterField>
          <FilterField label="Corrección manual">
            <select className={inputClass} value={filters.correccion_manual ?? ''} onChange={(event) => updateFilter('correccion_manual', event.target.value)}>
              <option value="">Todas</option>
              <option value="true">Con corrección</option>
              <option value="false">Sin corrección</option>
            </select>
          </FilterField>
          <FilterField label="Foto">
            <select className={inputClass} value={filters.con_foto ?? ''} onChange={(event) => updateFilter('con_foto', event.target.value)}>
              <option value="">Todas</option>
              <option value="true">Con foto</option>
              <option value="false">Sin foto</option>
            </select>
          </FilterField>
          <div className="flex items-end gap-2">
            <Button className="flex-1" variant="secondary" onClick={() => setFilters({ per_page: 30 })}>Limpiar</Button>
            <Button variant="ghost" onClick={() => void registros.refetch()} disabled={registros.isFetching} aria-label="Actualizar registros">
              <RefreshCw className={`h-4 w-4 ${registros.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
            </Button>
            <Button
              className="bg-[#0e5631] text-white hover:bg-[#0b4729]"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
            >
              <Download className="h-4 w-4 text-white" aria-hidden="true" />
              Exportar
            </Button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3">Fecha</th>
                <th className="border-b border-slate-200 px-4 py-3">Vehículo</th>
                <th className="border-b border-slate-200 px-4 py-3">Ubicación</th>
                <th className="border-b border-slate-200 px-4 py-3">Personal</th>
                <th className="border-b border-slate-200 px-4 py-3">Lecturas</th>
                <th className="border-b border-slate-200 px-4 py-3">Estado</th>
                <th className="border-b border-slate-200 px-4 py-3">Evidencia</th>
                <th className="border-b border-slate-200 px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(registros.data?.data ?? []).map((registro) => (
                <tr key={registro.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 align-top font-medium text-slate-700">{formatDateTime(registro.fecha_hora_inicio ?? registro.fecha)}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-bold text-slate-950">{vehicleName(registro.vehiculo)}</div>
                    <div className="text-xs font-medium text-slate-500">{registro.vehiculo?.placa ?? 'Sin placa'}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-slate-700">
                    <div>{registro.fundo?.nombre ?? '-'}</div>
                    <div className="text-xs text-slate-500">{registro.lote?.nombre ?? 'Sin lote'}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-slate-700">
                    <div>{personName(registro.operario)}</div>
                    <div className="text-xs text-slate-500">{registro.usuario_responsable?.name ?? 'Sin responsable'}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-slate-700">
                    <div>Inicial: <strong>{registro.horometro_inicial_confirmado ?? '-'}</strong></div>
                    <div>Final: <strong>{registro.horometro_final_confirmado ?? '-'}</strong></div>
                    <div>Horas: <strong>{registro.horas_trabajadas ?? '-'}</strong></div>
                  </td>
                  <td className="px-4 py-3 align-top"><StatusBadge value={registro.estado} variant="text" /></td>
                  <td className="px-4 py-3 align-top">
                    <span className="inline-flex items-center gap-2 text-slate-700">
                      <Camera className="h-4 w-4" aria-hidden="true" />
                      {Number(Boolean(registro.foto_inicial)) + Number(Boolean(registro.foto_final))}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <button
                      type="button"
                      onClick={() => setSelected(registro)}
                      className="inline-flex items-center justify-center p-1.5 transition-transform hover:scale-115 focus:outline-none cursor-pointer"
                      title="Ver detalle"
                      aria-label="Ver detalle"
                    >
                      <Eye className="h-5 w-5" style={{ color: '#5fcf49' }} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
              {!registros.isLoading && !registros.data?.data.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">No hay registros para los filtros seleccionados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-500">
          <span>Mostrando {registros.data?.data.length ?? 0} de {registros.data?.meta.total ?? 0} registros</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={(registros.data?.meta.current_page ?? 1) <= 1} onClick={() => setFilters((current) => ({ ...current, page: (registros.data?.meta.current_page ?? 1) - 1 }))}>Anterior</Button>
            <span className="rounded-md bg-emerald-700 px-3 py-2 font-black text-white">{registros.data?.meta.current_page ?? 1}</span>
            <Button variant="secondary" disabled={(registros.data?.meta.current_page ?? 1) >= (registros.data?.meta.last_page ?? 1)} onClick={() => setFilters((current) => ({ ...current, page: (registros.data?.meta.current_page ?? 1) + 1 }))}>Siguiente</Button>
          </div>
        </div>
      </section>

      {selected ? <RegistroDetailModal registro={selected} onClose={() => setSelected(null)} /> : null}
    </AppLayout>
  )
}

function RegistroDetailModal({ registro, onClose }: { registro: HorometroRegistro; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/40 p-4">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">Detalle de registro</h2>
            <p className="text-sm font-medium text-slate-500">{vehicleName(registro.vehiculo)}</p>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" type="button" onClick={onClose} aria-label="Cerrar detalle">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <Evidence title="Foto inicial" url={registro.foto_inicial_url} path={registro.foto_inicial} />
          <Evidence title="Foto final" url={registro.foto_final_url} path={registro.foto_final} />
        </div>
        <div className="grid gap-3 border-t border-slate-100 p-5 text-sm md:grid-cols-3">
          <Detail label="OCR inicial" value={registro.horometro_inicial_ocr ?? '-'} />
          <Detail label="Inicial confirmado" value={registro.horometro_inicial_confirmado ?? '-'} />
          <Detail label="Corrección inicial" value={registro.correccion_manual_inicio ? 'Sí' : 'No'} />
          <Detail label="OCR final" value={registro.horometro_final_ocr ?? '-'} />
          <Detail label="Final confirmado" value={registro.horometro_final_confirmado ?? '-'} />
          <Detail label="Corrección final" value={registro.correccion_manual_final ? 'Sí' : 'No'} />
          <Detail label="Inicio" value={formatDateTime(registro.fecha_hora_inicio)} />
          <Detail label="Cierre" value={formatDateTime(registro.fecha_hora_final)} />
          <Detail label="Estado" value={registro.estado.replaceAll('_', ' ')} />
          <Detail label="Fundo" value={registro.fundo?.nombre ?? '-'} />
          <Detail label="Lote" value={registro.lote?.nombre ?? '-'} />
          <Detail label="Responsable" value={registro.usuario_responsable?.name ?? '-'} />
        </div>
      </section>
    </div>
  )
}

function Evidence({ title, url, path }: { title: string; url?: string | null; path?: string | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 text-sm font-black text-slate-900">{title}</div>
      {url ? (
        <img className="h-64 w-full rounded-lg object-cover" src={url} alt={title} />
      ) : (
        <div className="grid h-64 place-items-center rounded-lg border border-dashed border-slate-300 text-sm font-medium text-slate-500">
          Sin imagen disponible
        </div>
      )}
      <div className="mt-2 truncate text-xs text-slate-500">{path ?? '-'}</div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-xs font-black uppercase text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  )
}
