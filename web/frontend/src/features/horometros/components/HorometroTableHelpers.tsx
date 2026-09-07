import { StatusBadge } from '../../taller/components/StatusBadge'
import { formatDate, formatDateTime, personName, vehicleName } from '../../taller/components/tallerFormatters'
import type { HorometroRegistro } from '../types'
import { Link } from 'react-router-dom'

export function RegistroSummary({ registro }: { registro: HorometroRegistro }) {
  return (
    <div className="grid gap-1">
      {registro.vehiculo?.id ? (
        <Link className="font-semibold text-slate-950 hover:text-emerald-700" to={`/vehiculos/${registro.vehiculo.id}`}>
          {vehicleName(registro.vehiculo)}
        </Link>
      ) : (
        <div className="font-semibold text-slate-950">{vehicleName(registro.vehiculo)}</div>
      )}
      <div className="text-xs text-slate-500">{registro.vehiculo?.tipo_vehiculo?.nombre ?? 'Equipo'}</div>
    </div>
  )
}

export function RegistroMeta({ registro }: { registro: HorometroRegistro }) {
  return (
    <div className="grid gap-1 text-sm">
      <span className="font-medium text-slate-900">{personName(registro.operario)}</span>
      <span className="text-xs text-slate-500">{formatDate(registro.fecha)}</span>
    </div>
  )
}

export function RegistroReadings({ registro }: { registro: HorometroRegistro }) {
  return (
    <div className="grid gap-1 text-sm text-slate-700">
      <span>Inicial: <strong>{registro.horometro_inicial_confirmado ?? '-'}</strong></span>
      <span>Final: <strong>{registro.horometro_final_confirmado ?? '-'}</strong></span>
      <span>Horas: <strong>{registro.horas_trabajadas ?? '-'}</strong></span>
    </div>
  )
}

export function RegistroTimelineMini({ registro }: { registro: HorometroRegistro }) {
  return (
    <div className="grid gap-1 text-xs text-slate-500">
      <span>Inicio: {formatDateTime(registro.fecha_hora_inicio)}</span>
      <span>Cierre: {formatDateTime(registro.fecha_hora_final)}</span>
    </div>
  )
}

export function RegistroState({ registro }: { registro: HorometroRegistro }) {
  return <StatusBadge value={registro.estado} />
}
