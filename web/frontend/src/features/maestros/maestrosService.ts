import { api } from '../../api/http'
import type { PaginatedResponse } from '../../types/api'
import type {
  Fundo,
  Gerencia,
  Lote,
  MasterFilters,
  MasterPayload,
  MasterRecord,
  MasterTabKey,
  PersonalImportRow,
  PersonalImportSummary,
  PersonalMaster,
  Sector,
  Sede,
  TipoFalla,
  TipoVehiculo,
  VehicleImportRow,
  VehicleImportSummary,
  VehicleBulkDeleteSummary,
  VehicleMeasurementPointHistory,
  VehiculoMaster,
} from './types'

type DataResponse<T> = {
  data: T
}

function cleanParams<T extends Record<string, string | number | undefined>>(params?: T) {
  return Object.fromEntries(
    Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== ''),
  )
}

export async function getMasterRecords(tab: MasterTabKey, filters?: MasterFilters) {
  const { data } = await api.get<PaginatedResponse<MasterRecord>>(`/${tab}`, {
    params: cleanParams(filters),
  })

  return data
}

export async function createMasterRecord(tab: MasterTabKey, payload: MasterPayload) {
  const { data } = await api.post<DataResponse<MasterRecord>>(`/${tab}`, payload)

  return data.data
}

export async function updateMasterRecord(tab: MasterTabKey, id: number, payload: MasterPayload) {
  const { data } = await api.put<DataResponse<MasterRecord>>(`/${tab}/${id}`, payload)

  return data.data
}

export async function deleteMasterRecord(tab: MasterTabKey, id: number) {
  await api.delete(`/${tab}/${id}`)
}

export async function deleteVehicleMasters(ids: number[]) {
  const { data } = await api.delete<DataResponse<VehicleBulkDeleteSummary>>('/vehiculos', {
    data: { ids },
  })

  return data.data
}

export async function getVehicleMeasurementPointHistory(id: number) {
  const { data } = await api.get<DataResponse<VehicleMeasurementPointHistory>>(`/vehiculos/${id}/puntos-medida`)

  return data.data
}

export async function importVehicleMasters(rows: VehicleImportRow[]) {
  const { data } = await api.post<DataResponse<VehicleImportSummary>>('/importaciones/vehiculos', { rows })

  return data.data
}

export async function downloadVehicleImportTemplate() {
  const { data } = await api.get<Blob>('/importaciones/vehiculos/plantilla', {
    responseType: 'blob',
  })

  return data
}

export async function importPersonalMasters(rows: PersonalImportRow[]) {
  const { data } = await api.post<DataResponse<PersonalImportSummary>>('/importaciones/personal', { rows })

  return data.data
}

export async function downloadPersonalImportTemplate() {
  const { data } = await api.get<Blob>('/importaciones/personal/plantilla', {
    responseType: 'blob',
  })

  return data
}

export async function getGerenciasMaster() {
  const { data } = await api.get<PaginatedResponse<Gerencia>>('/gerencias', {
    params: { per_page: 100 },
  })

  return data.data
}

export async function getSedesMaster() {
  const { data } = await api.get<PaginatedResponse<Sede>>('/sedes', {
    params: { per_page: 100 },
  })

  return data.data
}

export async function getFundosMaster() {
  const { data } = await api.get<PaginatedResponse<Fundo>>('/fundos', {
    params: { per_page: 100 },
  })

  return data.data
}

export async function getSectoresMaster() {
  const { data } = await api.get<PaginatedResponse<Sector>>('/sectores', {
    params: { per_page: 100 },
  })

  return data.data
}

export async function getLotesMaster() {
  const { data } = await api.get<PaginatedResponse<Lote>>('/lotes', {
    params: { per_page: 100 },
  })

  return data.data
}

export async function getTiposVehiculoMaster() {
  const { data } = await api.get<PaginatedResponse<TipoVehiculo>>('/tipos-vehiculo', {
    params: { estado: 'ACTIVO', per_page: 100 },
  })

  return data.data
}

export async function getAllVehiclesMaster(): Promise<VehiculoMaster[]> {
  const { data } = await api.get<PaginatedResponse<VehiculoMaster>>('/vehiculos', {
    params: { per_page: 100, page: 1 },
  })

  let allVehicles = [...data.data]
  const lastPage = data.meta.last_page

  if (lastPage > 1) {
    const pagePromises = []
    for (let p = 2; p <= lastPage; p++) {
      pagePromises.push(
        api.get<PaginatedResponse<VehiculoMaster>>('/vehiculos', {
          params: { per_page: 100, page: p },
        })
      )
    }
    const results = await Promise.all(pagePromises)
    for (const res of results) {
      allVehicles = allVehicles.concat(res.data.data)
    }
  }

  return allVehicles
}

export type MasterTypedRecord =
  | VehiculoMaster
  | PersonalMaster
  | Gerencia
  | Sede
  | Fundo
  | Sector
  | Lote
  | TipoVehiculo
  | TipoFalla
