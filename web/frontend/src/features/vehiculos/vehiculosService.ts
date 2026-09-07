import { api } from '../../api/http'
import type { MantenimientoPreventivoListado, Vehiculo360 } from './types'

type DataResponse<T> = {
  data: T
}

export async function getVehiculo360(id: string | number) {
  const { data } = await api.get<DataResponse<Vehiculo360>>(`/vehiculos/${id}/trazabilidad`)

  return data.data
}

export async function getPreventivos() {
  const { data } = await api.get<MantenimientoPreventivoListado>('/taller/preventivos')

  return data
}
