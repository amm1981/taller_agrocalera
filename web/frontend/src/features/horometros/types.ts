import type { Personal, Vehiculo } from '../taller/types'
import type { Fundo, Lote, Sector } from '../maestros/types'

export type HorometroEstado =
  | 'PENDIENTE_INICIO'
  | 'EN_JORNADA'
  | 'COMPLETO'
  | 'SIN_INICIO'
  | 'SIN_CIERRE'
  | 'INCONSISTENCIA'
  | 'REGULARIZADO'
  | 'OBSERVADO'
  | 'ANULADO'

export type HorometroRegistro = {
  id: number
  vehiculo_id: number
  fecha: string
  semana_iso: number | null
  semana_anio: number | null
  operario_id: number | null
  usuario_responsable_id: number | null
  fundo_id: number | null
  sector_id: number | null
  lote_id: number | null
  punto_medida: string | null
  horometro_inicial_ocr: string | number | null
  horometro_inicial_confirmado: string | number | null
  foto_inicial: string | null
  foto_inicial_url?: string | null
  fecha_hora_inicio: string | null
  correccion_manual_inicio: boolean
  horometro_final_ocr: string | number | null
  horometro_final_confirmado: string | number | null
  foto_final: string | null
  foto_final_url?: string | null
  fecha_hora_final: string | null
  correccion_manual_final: boolean
  horas_trabajadas: string | number | null
  estado: HorometroEstado
  observacion: string | null
  vehiculo?: (Vehiculo & { tipo_vehiculo?: { id: number; nombre: string } | null }) | null
  fundo?: Fundo | null
  sector?: Sector | null
  lote?: Lote | null
  operario?: Personal | null
  usuario_responsable?: {
    id: number
    name: string
    email: string
  } | null
}

export type HorometroDashboard = {
  fecha: string
  fecha_desde: string
  fecha_hasta: string
  inicios_esperados: number
  inicios_registrados: number
  cierres_esperados: number
  cierres_registrados: number
  pendientes_cierre: number
  inconsistencias: number
  observados: number
  correcciones_manuales: number
  vehiculos_sin_registro: number
  vehiculos_jornada_completa: number
  top_vehiculos_horas: Array<{
    vehiculo_id: number
    horas: string | number
    vehiculo?: Vehiculo | null
  }>
  alertas: Array<{
    tipo: string
    mensaje: string
  }>
  sin_registro_muestra: Vehiculo[]
}

export type HorometroFilters = {
  fecha?: string
  fecha_desde?: string
  fecha_hasta?: string
  vehiculo_id?: string
  operario_id?: string
  usuario_responsable_id?: string
  fundo_id?: string
  sede_id?: string
  sector_id?: string
  lote_id?: string
  tipo_vehiculo_id?: string
  semana_iso?: string
  semana_anio?: string
  correccion_manual?: string
  con_foto?: string
  estado?: string
  page?: number
  per_page?: number
}

export type RegistrarInicioPayload = {
  vehiculo_id: number
  fecha?: string
  operario_id?: number | null
  fundo_id?: number | null
  sector_id?: number | null
  lote_id?: number | null
  horometro_inicial_ocr?: string | number | null
  horometro_inicial_confirmado: string | number
  foto_inicial: string
  fecha_hora_inicio?: string
  correccion_manual_inicio?: boolean
}

export type RegistrarCierrePayload = {
  horometro_final_ocr?: string | number | null
  horometro_final_confirmado: string | number
  foto_final: string
  fecha_hora_final?: string
  correccion_manual_final?: boolean
}

export type HorometrosReporte = {
  horas_totales: number
  registros_completos: number
  por_vehiculo: Array<{
    vehiculo: Vehiculo | null
    horas: number
  }>
}

export type HorometroConfiguracion = {
  id: number
  tipo_vehiculo_id?: number | null
  hora_inicio_desde: string
  hora_inicio_hasta: string
  hora_cierre_hasta: string
  tolerancia_inicio_horas: string | number
  tolerancia_maxima_horas_dia: string | number
  permite_correccion_manual: boolean
  foto_obligatoria: boolean
  vigencia_reapertura_minutos: number
  ocr_activo: boolean
  campos_requeridos?: {
    sede?: boolean
    operario?: boolean
    foto?: boolean
  } | null
  parametros_adicionales?: {
    personal_tipos?: string[]
    [key: string]: unknown
  } | null
}

export type HorometroConfiguracionPorTipo = {
  tipo_vehiculo: {
    id: number
    nombre: string
    estado: string
    icono_path?: string | null
    icono_url?: string | null
  }
  configuracion: HorometroConfiguracion
}

export type HorometroReapertura = {
  id: number
  vehiculo_id: number
  fecha: string
  tipo_registro: 'INICIO' | 'CIERRE'
  usuario_id: number
  fecha_hora: string
  estado_anterior: string | null
  estado_posterior: string
  motivo: string | null
  vigente_hasta: string | null
  consumida_at: string | null
  vehiculo?: Vehiculo | null
  usuario?: {
    id: number
    name: string
    email: string
  } | null
}

export type HorometroReaperturasBoard = {
  fecha: string
  con_registro: HorometroRegistro[]
  sin_registro: Vehiculo[]
  reaperturas: HorometroReapertura[]
}

export type CrearReaperturaPayload = {
  fecha: string
  vehiculo_ids: number[]
  tipo_registro: 'INICIO' | 'CIERRE'
  motivo: string
  vigencia_minutos?: number
}
