import type { HorometroRegistro } from '../horometros/types'
import type { OrdenTrabajo } from '../taller/types'
import type { VehiculoMaster } from '../maestros/types'

export type Vehiculo360Metricas = {
  horometro_actual: string | number | null
  horas_totales: number
  horas_ultimos_30_dias: number
  registros_completos: number
  registros_observados: number
  ordenes_totales: number
  ordenes_abiertas: number
  ordenes_ultimos_30_dias: number
  repuestos_pendientes: number
  ultimo_registro_fecha: string | null
}

export type Vehiculo360Alerta = {
  tipo: string
  nivel: 'critico' | 'advertencia' | 'info'
  titulo: string
  detalle: string
}

export type PreventivoEstado = 'AL_DIA' | 'PROXIMO' | 'VENCIDO' | 'SIN_HOROMETRO' | 'SIN_PLAN'

export type MantenimientoPreventivoPlan = {
  id: number
  nombre: string
  intervalo_horas: number
  tolerancia_horas: number
  descripcion: string | null
  estado: PreventivoEstado
  proximo_servicio_horas: number | null
  horas_restantes: number | null
  porcentaje_ciclo: number
}

export type MantenimientoPreventivoResumen = {
  estado: PreventivoEstado
  horometro_actual: number | null
  plan_critico: MantenimientoPreventivoPlan | null
  planes: MantenimientoPreventivoPlan[]
}

export type Vehiculo360 = {
  vehiculo: VehiculoMaster
  metricas: Vehiculo360Metricas
  alertas: Vehiculo360Alerta[]
  mantenimiento_preventivo: MantenimientoPreventivoResumen
  ordenes_recientes: OrdenTrabajo[]
  registros_recientes: HorometroRegistro[]
}

export type MantenimientoPreventivoRow = {
  vehiculo: VehiculoMaster
  preventivo: MantenimientoPreventivoResumen
}

export type MantenimientoPreventivoListado = {
  data: MantenimientoPreventivoRow[]
  resumen: {
    total: number
    vencidos: number
    proximos: number
    sin_horometro: number
    al_dia: number
  }
}
