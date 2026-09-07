export type ApiEntity = {
  id: number
  codigo?: string | null
  nombre?: string | null
}

export type Personal = {
  id: number
  dni: string
  nombres: string
  apellidos: string
  tipo?: string
  estado?: string
}

export type Vehiculo = ApiEntity & {
  placa?: string | null
  estado?: string
}

export type OrdenEstado =
  | 'PENDIENTE'
  | 'EN_CURSO'
  | 'ESPERANDO_REPUESTO'
  | 'FINALIZADA_CON_PENDIENTE'
  | 'FINALIZADA'

export type EstadoEquipo =
  | 'OPERATIVO'
  | 'OPERATIVO_CON_PENDIENTE'
  | 'FUERA_DE_SERVICIO'
  | 'MANTENIMIENTO'

export type RepuestoEstado = 'SOLICITADO' | 'DISPONIBLE' | 'ENTREGADO'

export type OrdenTrabajoEvento = {
  id: number
  tipo_evento: string
  descripcion: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  usuario?: {
    id: number
    name: string
    email: string
  } | null
}

export type SolicitudRepuesto = {
  id: number
  orden_trabajo_id: number
  tecnico_id: number
  descripcion_solicitada: string
  codigo_sap: string | null
  descripcion_sap: string | null
  cantidad: string | number
  estado: RepuestoEstado
  observacion: string | null
  fecha_solicitud: string
  fecha_disponible: string | null
  fecha_recojo: string | null
  orden_trabajo?: Pick<
    OrdenTrabajo,
    'id' | 'numero_ot' | 'estado' | 'estado_equipo' | 'fecha_reporte'
  > & {
    vehiculo?: Vehiculo | null
  }
  tecnico?: Personal | null
}

export type OrdenTrabajo = {
  id: number
  numero_ot: string | null
  vehiculo_id: number
  gerencia_id: number
  tipo_falla_id: number
  detalle_reporte: string
  reportado_por_id: number | null
  tecnico_id: number | null
  tipo_atencion: string | null
  diagnostico: string | null
  trabajo_realizado: string | null
  trabajo_pendiente: string | null
  estado: OrdenEstado
  estado_equipo: EstadoEquipo
  fecha_reporte: string
  fecha_inicio_atencion: string | null
  fecha_finalizacion: string | null
  fecha_pendiente: string | null
  fecha_resolucion: string | null
  vehiculo?: Vehiculo | null
  gerencia?: ApiEntity | null
  tipo_falla?: ApiEntity | null
  reportado_por?: Personal | null
  tecnico?: Personal | null
  repuestos?: SolicitudRepuesto[]
  eventos?: OrdenTrabajoEvento[]
}

export type TallerDashboard = {
  ordenes: {
    pendientes: number
    en_curso: number
    esperando_repuesto: number
    backlog: number
    finalizadas: number
  }
  repuestos: {
    solicitados: number
    disponibles: number
    entregados: number
  }
}

export type OrdenTrabajoFilters = {
  q?: string
  fecha_desde?: string
  fecha_hasta?: string
  gerencia_id?: string
  vehiculo_id?: string
  tecnico_id?: string
  estado?: string
  page?: number
  per_page?: number
}

export type RepuestoFilters = {
  estado?: string
  fecha_desde?: string
  fecha_hasta?: string
  tecnico_id?: string
  orden_trabajo_id?: string
  page?: number
  per_page?: number
}

export type TallerTiemposReporte = {
  tiempo_promedio_respuesta_minutos: number | null
  tiempo_promedio_atencion_minutos: number | null
  tiempo_promedio_requerimiento_minutos: number | null
  mttr_minutos: number | null
}

export type TallerEquipoReporte = {
  vehiculo: Vehiculo | null
  total_ordenes: number
  pendientes: number
  finalizadas: number
}

export type TallerTecnicoReporte = {
  tecnico: Personal | null
  total_ordenes: number
  en_curso: number
  finalizadas: number
}

export type TallerBacklogReporte = {
  orden: OrdenTrabajo
  antiguedad_dias: number
}
