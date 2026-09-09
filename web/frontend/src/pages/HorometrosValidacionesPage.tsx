import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckSquare, Lock, RotateCcw, Search, Unlock, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { getVehiculos } from '../features/maestros/masterDataService'
import { getSedesMaster, getTiposVehiculoMaster } from '../features/maestros/maestrosService'
import {
  crearHorometroReaperturas,
  getHorometroReaperturas,
  getHorometroValidaciones,
  reabrirHorometro,
} from '../features/horometros/horometrosService'
import { limaTodayYmd } from '../features/horometros/dateUtils'
import type { HorometroFilters, HorometroReapertura, HorometroRegistro } from '../features/horometros/types'
import { StatusBadge } from '../features/taller/components/StatusBadge'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import { formatDateTime, vehicleName } from '../features/taller/components/tallerFormatters'
import { AppLayout } from '../layouts/AppLayout'

type TabKey = 'inconsistencias' | 'observados' | 'reaperturas' | 'sin-registro'
type ReopenTarget = {
  mode: 'registro' | 'vehiculos'
  registro?: HorometroRegistro
  vehicleIds?: number[]
  tipo: 'INICIO' | 'CIERRE'
}

export function HorometrosValidacionesPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<TabKey>('inconsistencias')
  const [filters, setFilters] = useState<HorometroFilters>({ fecha: limaTodayYmd(), per_page: 80 })
  const [selectedVehicles, setSelectedVehicles] = useState<number[]>([])
  const [target, setTarget] = useState<ReopenTarget | null>(null)

  const validaciones = useQuery({
    queryKey: ['horometros-validaciones', filters],
    queryFn: () => getHorometroValidaciones(filters),
  })
  const reaperturas = useQuery({
    queryKey: ['horometros-reaperturas', filters],
    queryFn: () => getHorometroReaperturas(filters),
  })
  const sedes = useQuery({ queryKey: ['maestros-sedes-lookup'], queryFn: getSedesMaster })
  const tiposVehiculo = useQuery({ queryKey: ['tipos-vehiculo'], queryFn: getTiposVehiculoMaster })
  const vehiculos = useQuery({ queryKey: ['vehiculos'], queryFn: getVehiculos })

  const reopenRegistro = useMutation({
    mutationFn: ({ registro, tipo, motivo, vigencia }: { registro: HorometroRegistro; tipo: 'INICIO' | 'CIERRE'; motivo: string; vigencia: number }) =>
      reabrirHorometro(registro.id, tipo, motivo, vigencia),
    onSuccess: async () => refresh(queryClient),
  })
  const reopenBulk = useMutation({
    mutationFn: ({ vehicleIds, tipo, motivo, vigencia }: { vehicleIds: number[]; tipo: 'INICIO' | 'CIERRE'; motivo: string; vigencia: number }) =>
      crearHorometroReaperturas({
        fecha: filters.fecha ?? limaTodayYmd(),
        vehiculo_ids: vehicleIds,
        tipo_registro: tipo,
        motivo,
        vigencia_minutos: vigencia,
      }),
    onSuccess: async () => {
      setSelectedVehicles([])
      await refresh(queryClient)
    },
  })

  const rows = validaciones.data?.data ?? []
  const inconsistencias = rows.filter((row) => row.estado === 'INCONSISTENCIA')
  const observados = rows.filter((row) => row.estado === 'OBSERVADO')
  const sinRegistro = reaperturas.data?.sin_registro ?? []
  const conRegistro = reaperturas.data?.con_registro ?? []
  const logReaperturas = reaperturas.data?.reaperturas ?? []

  const tabs = useMemo(() => [
    { key: 'inconsistencias' as const, label: 'Inconsistencias', count: inconsistencias.length },
    { key: 'observados' as const, label: 'Observados', count: observados.length },
    { key: 'reaperturas' as const, label: 'Reaperturas', count: logReaperturas.length },
    { key: 'sin-registro' as const, label: 'Sin registro', count: sinRegistro.length },
  ], [inconsistencias.length, observados.length, logReaperturas.length, sinRegistro.length])

  const updateFilter = (key: keyof HorometroFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value || undefined, page: 1 }))
    setSelectedVehicles([])
  }

  return (
    <AppLayout title="Horómetros · Validaciones" description="Inconsistencias, observados, reaperturas y omisiones de registro">
      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <FilterField label="Fecha">
            <input className={inputClass} type="date" value={filters.fecha ?? ''} onChange={(event) => updateFilter('fecha', event.target.value)} />
          </FilterField>
          <FilterField label="Sede">
            <select className={inputClass} value={filters.sede_id ?? ''} onChange={(event) => updateFilter('sede_id', event.target.value)}>
              <option value="">Todas</option>
              {(sedes.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
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
          <div className="flex items-end">
            <Button className="w-full" variant="secondary" onClick={() => refresh(queryClient)}>
              <Search className="h-4 w-4" aria-hidden="true" />
              Consultar
            </Button>
          </div>
        </div>
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold ${tab === item.key ? 'bg-emerald-700 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            onClick={() => {
              setTab(item.key)
              setSelectedVehicles([])
            }}
          >
            {item.label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${tab === item.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{item.count}</span>
          </button>
        ))}
      </div>

      {tab === 'inconsistencias' ? (
        <ValidationTable
          rows={inconsistencias}
          empty="No hay inconsistencias para la fecha."
          tipoFor={(registro) => registro.fecha_hora_final ? 'CIERRE' : 'INICIO'}
          isOpen={(registro, tipo) => hasActiveReopening(logReaperturas, registro.vehiculo_id, registro.fecha, tipo)}
          onReopen={(registro, tipo) => setTarget({ mode: 'registro', registro, tipo })}
        />
      ) : null}
      {tab === 'observados' ? (
        <ValidationTable
          rows={observados}
          empty="No hay registros observados."
          tipoFor={(registro) => registro.fecha_hora_final ? 'CIERRE' : 'INICIO'}
          isOpen={(registro, tipo) => hasActiveReopening(logReaperturas, registro.vehiculo_id, registro.fecha, tipo)}
          onReopen={(registro, tipo) => setTarget({ mode: 'registro', registro, tipo })}
        />
      ) : null}
      {tab === 'reaperturas' ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <RegistroReopenPanel
            rows={conRegistro}
            selectedVehicles={selectedVehicles}
            onToggleVehicle={(vehiculoId, checked) => {
              setSelectedVehicles((current) => checked ? [...new Set([...current, vehiculoId])] : current.filter((id) => id !== vehiculoId))
            }}
            onBulk={() => setTarget({ mode: 'vehiculos', vehicleIds: selectedVehicles, tipo: 'INICIO' })}
            isOpen={(registro, tipo) => hasActiveReopening(logReaperturas, registro.vehiculo_id, registro.fecha, tipo)}
            onReopen={(registro, tipo) => setTarget({ mode: 'registro', registro, tipo })}
          />
          <AuditPanel rows={logReaperturas} />
        </section>
      ) : null}
      {tab === 'sin-registro' ? (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-base font-black text-slate-950">Vehículos sin registro</h2>
              <p className="text-sm font-medium text-slate-500">Selecciona varios para apertura manual excepcional.</p>
            </div>
            <Button
              disabled={!selectedVehicles.length}
              onClick={() => setTarget({ mode: 'vehiculos', vehicleIds: selectedVehicles, tipo: 'INICIO' })}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reapertura masiva
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {sinRegistro.map((vehiculo) => {
              const checked = selectedVehicles.includes(vehiculo.id)
              return (
                <label key={vehiculo.id} className="grid cursor-pointer grid-cols-[28px_1fr_auto] items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      setSelectedVehicles((current) => event.target.checked ? [...current, vehiculo.id] : current.filter((id) => id !== vehiculo.id))
                    }}
                  />
                  <span>
                    <strong className="text-slate-950">{vehicleName(vehiculo)}</strong>
                    <span className="ml-2 text-xs font-medium text-slate-500">{vehiculo.placa ?? 'Sin placa'}</span>
                  </span>
                  <ReopenLockButton
                    label="Aperturar vehículo sin registro"
                    isOpen={hasActiveReopening(logReaperturas, vehiculo.id, filters.fecha ?? limaTodayYmd(), 'INICIO')}
                    onClick={() => setTarget({ mode: 'vehiculos', vehicleIds: [vehiculo.id], tipo: 'INICIO' })}
                  />
                </label>
              )
            })}
            {!sinRegistro.length ? <Empty text="Todos los vehículos filtrados tienen registro." /> : null}
          </div>
        </section>
      ) : null}

      {target ? (
        <ReopenModal
          target={target}
          loading={reopenRegistro.isPending || reopenBulk.isPending}
          onClose={() => setTarget(null)}
          onSubmit={(tipo, motivo, vigencia) => {
            if (target.mode === 'registro' && target.registro) {
              reopenRegistro.mutate({ registro: target.registro, tipo, motivo, vigencia }, { onSuccess: () => setTarget(null) })
            } else {
              reopenBulk.mutate({ vehicleIds: target.vehicleIds ?? [], tipo, motivo, vigencia }, { onSuccess: () => setTarget(null) })
            }
          }}
        />
      ) : null}
    </AppLayout>
  )
}

function ValidationTable({
  rows,
  empty,
  tipoFor,
  isOpen,
  onReopen,
}: {
  rows: HorometroRegistro[]
  empty: string
  tipoFor: (registro: HorometroRegistro) => 'INICIO' | 'CIERRE'
  isOpen: (registro: HorometroRegistro, tipo: 'INICIO' | 'CIERRE') => boolean
  onReopen: (registro: HorometroRegistro, tipo: 'INICIO' | 'CIERRE') => void
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[920px] w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
          <tr>
            <th className="border-b border-slate-200 px-4 py-3">Fecha</th>
            <th className="border-b border-slate-200 px-4 py-3">Vehículo</th>
            <th className="border-b border-slate-200 px-4 py-3">Lecturas</th>
            <th className="border-b border-slate-200 px-4 py-3">Problema</th>
            <th className="border-b border-slate-200 px-4 py-3">Estado</th>
            <th className="border-b border-slate-200 px-4 py-3">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((registro) => {
            const tipo = tipoFor(registro)

            return (
              <tr key={registro.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">{formatDateTime(registro.fecha_hora_inicio ?? registro.fecha)}</td>
                <td className="px-4 py-3 font-bold text-slate-950">{vehicleName(registro.vehiculo)}</td>
                <td className="px-4 py-3 text-slate-700">Ini. {registro.horometro_inicial_confirmado ?? '-'} / Fin. {registro.horometro_final_confirmado ?? '-'}</td>
                <td className="px-4 py-3 text-slate-700">{registro.observacion ?? 'Pendiente de revisión'}</td>
                <td className="px-4 py-3"><StatusBadge value={registro.estado} /></td>
                <td className="px-4 py-3">
                  <ReopenLockButton
                    label={`Aperturar ${tipo === 'INICIO' ? 'inicio' : 'cierre'}`}
                    isOpen={isOpen(registro, tipo)}
                    onClick={() => onReopen(registro, tipo)}
                  />
                </td>
              </tr>
            )
          })}
          {!rows.length ? <tr><td colSpan={6}><Empty text={empty} /></td></tr> : null}
        </tbody>
      </table>
    </section>
  )
}

function RegistroReopenPanel({
  rows,
  selectedVehicles,
  onToggleVehicle,
  onBulk,
  isOpen,
  onReopen,
}: {
  rows: HorometroRegistro[]
  selectedVehicles: number[]
  onToggleVehicle: (vehiculoId: number, checked: boolean) => void
  onBulk: () => void
  isOpen: (registro: HorometroRegistro, tipo: 'INICIO' | 'CIERRE') => boolean
  onReopen: (registro: HorometroRegistro, tipo: 'INICIO' | 'CIERRE') => void
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-base font-black text-slate-950">Con registro</h2>
          <p className="text-sm font-medium text-slate-500">Puedes reabrir individualmente o seleccionar varios.</p>
        </div>
        <Button disabled={!selectedVehicles.length} onClick={onBulk}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reapertura masiva
        </Button>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((registro) => (
          <div key={registro.id} className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[28px_1fr_auto] md:items-center">
            <input
              type="checkbox"
              checked={selectedVehicles.includes(registro.vehiculo_id)}
              onChange={(event) => onToggleVehicle(registro.vehiculo_id, event.target.checked)}
              aria-label={`Seleccionar ${vehicleName(registro.vehiculo)}`}
            />
            <div>
              <div className="font-bold text-slate-950">{vehicleName(registro.vehiculo)}</div>
              <div className="text-xs font-medium text-slate-500">{registro.estado.replaceAll('_', ' ')} · {formatDateTime(registro.fecha_hora_inicio ?? registro.fecha)}</div>
            </div>
            <div className="flex gap-2">
              <ReopenLockButton label="Aperturar inicio" isOpen={isOpen(registro, 'INICIO')} onClick={() => onReopen(registro, 'INICIO')} />
              <ReopenLockButton label="Aperturar cierre" isOpen={isOpen(registro, 'CIERRE')} onClick={() => onReopen(registro, 'CIERRE')} />
            </div>
          </div>
        ))}
        {!rows.length ? <Empty text="No hay registros para reabrir." /> : null}
      </div>
    </section>
  )
}

function ReopenLockButton({ label, isOpen, onClick }: { label: string; isOpen: boolean; onClick: () => void }) {
  const Icon = isOpen ? Unlock : Lock
  const state = isOpen ? 'Aperturado' : 'Cerrado'

  return (
    <button
      type="button"
      className={`inline-grid h-10 w-10 place-items-center rounded-lg border transition ${isOpen ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}
      onClick={(event) => {
        event.preventDefault()
        onClick()
      }}
      aria-label={`${label}. Estado: ${state}`}
      title={state}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{state}</span>
    </button>
  )
}

function AuditPanel({ rows }: { rows: Array<{ id: number; fecha_hora: string; tipo_registro: string; motivo: string | null; estado_anterior: string | null; estado_posterior: string; vigente_hasta: string | null; consumida_at: string | null; vehiculo?: { codigo?: string | null; nombre?: string | null } | null; usuario?: { name: string } | null }> }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-base font-black text-slate-950">Auditoría de reaperturas</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.id} className="px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <strong className="text-slate-950">{vehicleLabel(row.vehiculo)}</strong>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-800">{row.tipo_registro}</span>
            </div>
            <div className="mt-1 text-xs font-medium text-slate-500">{formatDateTime(row.fecha_hora)} · {row.usuario?.name ?? 'Sistema'}</div>
            <div className="mt-2 text-slate-700">{row.motivo ?? '-'}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
              <span>{row.estado_anterior ?? 'Sin registro'} → {row.estado_posterior}</span>
              <span>{row.consumida_at ? 'Consumida' : `Vigente hasta ${formatDateTime(row.vigente_hasta)}`}</span>
            </div>
          </div>
        ))}
        {!rows.length ? <Empty text="Todavía no hay reaperturas." /> : null}
      </div>
    </section>
  )
}

function hasActiveReopening(reaperturas: HorometroReapertura[], vehicleId: number, fecha: string, tipo: 'INICIO' | 'CIERRE') {
  const now = Date.now()

  return reaperturas.some((item) => (
    item.vehiculo_id === vehicleId
    && item.tipo_registro === tipo
    && sameDate(item.fecha, fecha)
    && !item.consumida_at
    && (!item.vigente_hasta || new Date(item.vigente_hasta).getTime() >= now)
  ))
}

function sameDate(left?: string | null, right?: string | null) {
  return String(left ?? '').slice(0, 10) === String(right ?? '').slice(0, 10)
}

function ReopenModal({ target, loading, onClose, onSubmit }: { target: ReopenTarget; loading: boolean; onClose: () => void; onSubmit: (tipo: 'INICIO' | 'CIERRE', motivo: string, vigencia: number) => void }) {
  const [tipo, setTipo] = useState<'INICIO' | 'CIERRE'>(target.tipo)
  const [motivo, setMotivo] = useState('')
  const [vigencia, setVigencia] = useState(120)
  const subject = target.mode === 'registro'
    ? vehicleName(target.registro?.vehiculo)
    : `${target.vehicleIds?.length ?? 0} vehículo(s)`

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/40 p-4">
      <section className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">Crear reapertura</h2>
            <p className="text-sm font-medium text-slate-500">{subject}</p>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" type="button" onClick={onClose} aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 p-5">
          <FilterField label="Tipo de registro a reaperturar">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {(['INICIO', 'CIERRE'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`h-11 rounded-lg text-sm font-black transition ${tipo === option ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
                  onClick={() => setTipo(option)}
                >
                  {option === 'INICIO' ? 'Registro de inicio' : 'Registro de cierre'}
                </button>
              ))}
            </div>
          </FilterField>
          <FilterField label="Motivo obligatorio">
            <textarea className={`${inputClass} h-28 resize-none py-3`} value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="Ej. Registro autorizado por olvido de captura dentro del horario." />
          </FilterField>
          <FilterField label="Vigencia en minutos">
            <input className={inputClass} type="number" min={15} max={1440} value={vigencia} onChange={(event) => setVigencia(Number(event.target.value))} />
          </FilterField>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={loading || motivo.trim().length < 8} onClick={() => onSubmit(tipo, motivo.trim(), vigencia)}>
            <CheckSquare className="h-4 w-4" />
            Crear
          </Button>
        </div>
      </section>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-sm font-medium text-slate-500">{text}</div>
}

function vehicleLabel(vehicle?: { codigo?: string | null; nombre?: string | null } | null) {
  if (!vehicle) {
    return '-'
  }

  return [vehicle.codigo, vehicle.nombre].filter(Boolean).join(' - ')
}

async function refresh(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['horometros-validaciones'] }),
    queryClient.invalidateQueries({ queryKey: ['horometros-reaperturas'] }),
    queryClient.invalidateQueries({ queryKey: ['horometros-dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['horometros-registros'] }),
  ])
}
