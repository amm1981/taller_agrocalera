import type { OrdenTrabajo, Personal, Vehiculo } from '../types'

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

export function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
  }).format(new Date(normalized))
}

export function formatMinutes(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '-'
  }

  if (value < 60) {
    return `${value.toFixed(0)} min`
  }

  return `${(value / 60).toFixed(1)} h`
}

export function personName(person?: Personal | null) {
  if (!person) {
    return 'Sin asignar'
  }

  return `${person.nombres} ${person.apellidos}`.trim()
}

export function vehicleName(vehicle?: Vehiculo | null) {
  if (!vehicle) {
    return '-'
  }

  return [vehicle.codigo, vehicle.nombre].filter(Boolean).join(' - ')
}

export function orderNumber(order?: Pick<OrdenTrabajo, 'numero_ot' | 'id'> | null) {
  if (!order) {
    return '-'
  }

  return order.numero_ot ?? `OT-${order.id}`
}

export function daysSince(value?: string | null) {
  if (!value) {
    return 0
  }

  const created = new Date(value).getTime()
  const now = new Date().getTime()

  return Math.max(0, Math.floor((now - created) / 86_400_000))
}
