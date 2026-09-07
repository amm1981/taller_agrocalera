import { StatusBadge } from '../../taller/components/StatusBadge'
import type { MasterRecord } from '../types'

export function masterStatus(value?: string | null) {
  return <StatusBadge value={value ?? 'ACTIVO'} />
}

export function recordTitle(record: MasterRecord) {
  if ('codigo' in record && record.codigo) {
    return `${record.codigo} - ${record.nombre ?? ''}`.trim()
  }

  if ('dni' in record) {
    return `${record.dni} - ${record.nombres} ${record.apellidos}`
  }

  return record.nombre ?? `Registro ${record.id}`
}

export function relationLabel(value?: { codigo?: string | null; nombre?: string | null } | null) {
  if (!value) {
    return '-'
  }

  return [value.codigo, value.nombre].filter(Boolean).join(' - ')
}
