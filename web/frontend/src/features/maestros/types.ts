import type { ApiEntity } from '../taller/types'

export type MasterStatus = 'ACTIVO' | 'INACTIVO'

export type MasterTabKey =
  | 'vehiculos'
  | 'personal'
  | 'gerencias'
  | 'sedes'
  | 'fundos'
  | 'sectores'
  | 'lotes'
  | 'tipos-vehiculo'
  | 'tipos-falla'
  | 'tipos-personal'

export type MasterFilters = {
  q?: string
  estado?: string
  page?: number
  per_page?: number
}

export type SimpleCatalog = ApiEntity & {
  codigo?: string
  estado: MasterStatus
}

export type Sede = SimpleCatalog
export type Gerencia = SimpleCatalog

export type Fundo = SimpleCatalog & {
  sede_id: number
  sede?: Sede | null
}

export type Sector = SimpleCatalog & {
  fundo_id: number
  fundo?: Fundo | null
}

export type Lote = SimpleCatalog & {
  sector_id: number
  sector?: Sector | null
}

export type TipoVehiculo = {
  id: number
  nombre: string
  requiere_horometro: boolean
  requiere_login_horometro: boolean
  estado: MasterStatus
}

export type TipoFalla = {
  id: number
  nombre: string
  estado: MasterStatus
}

export type TipoPersonal = SimpleCatalog

export type VehiculoMaster = {
  id: number
  codigo: string
  placa: string | null
  nombre: string | null
  tipo_vehiculo_id: number
  marca: string | null
  modelo: string | null
  punto_medida: string | null
  punto_medida_vigente_desde: string | null
  gerencia_id: number | null
  sede_id: number
  fundo_id: number | null
  sector_id: number | null
  lote_id: number | null
  horometro_base: string | number | null
  estado: string
  activo: boolean
  tipo_vehiculo?: TipoVehiculo | null
  gerencia?: Gerencia | null
  sede?: Sede | null
  fundo?: Fundo | null
  sector?: Sector | null
  lote?: Lote | null
}

export type PersonalMaster = {
  id: number
  dni: string
  nombres: string
  apellidos: string
  tipo: string
  gerencia_id: number | null
  sede_id: number | null
  estado: MasterStatus
  gerencia?: Gerencia | null
  sede?: Sede | null
}

export type MasterRecord =
  | VehiculoMaster
  | PersonalMaster
  | Gerencia
  | Sede
  | Fundo
  | Sector
  | Lote
  | TipoVehiculo
  | TipoFalla
  | TipoPersonal

export type MasterPayload = Record<string, string | number | boolean | null>

export type MasterLookups = {
  gerencias: Gerencia[]
  sedes: Sede[]
  fundos: Fundo[]
  sectores: Sector[]
  lotes: Lote[]
  tiposVehiculo: TipoVehiculo[]
  tiposPersonal: TipoPersonal[]
}

export type VehicleImportRow = {
  codigo: string
  tipo_vehiculo: string
  placa?: string
  nombre?: string
  marca?: string
  modelo?: string
  punto_medida?: string
  punto_medida_vigente_desde?: string
  sede: string
  horometro_base?: string
}

export type VehicleImportSummary = {
  tipos_creados: number
  tipos_actualizados: number
  vehiculos_creados: number
  vehiculos_actualizados: number
}

export type VehicleBulkDeleteSummary = {
  eliminados: number
  bloqueados: Array<Pick<VehiculoMaster, 'id' | 'codigo' | 'nombre'>>
}

export type VehicleMeasurementPointHistoryItem = {
  id: number
  punto_medida: string
  vigente_desde: string | null
  registros_count: number
  usuario?: {
    id: number
    name: string
    last_name: string | null
    username: string | null
  } | null
  created_at: string | null
}

export type VehicleMeasurementPointHistory = {
  vehiculo: VehiculoMaster
  total_cambios: number
  historial: VehicleMeasurementPointHistoryItem[]
}

export type PersonalImportRow = {
  dni: string
  nombres: string
  apellidos: string
  tipo: string
  gerencia?: string
  sede?: string
  estado?: string
}

export type PersonalImportSummary = {
  personal_creado: number
  personal_actualizado: number
}
