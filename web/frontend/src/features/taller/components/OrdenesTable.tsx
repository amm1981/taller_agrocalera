import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import { MoreVertical } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { OrdenTrabajo } from '../types'
import { StatusBadge } from './StatusBadge'
import { formatDate, orderNumber, personName, vehicleName } from './tallerFormatters'

const features = tableFeatures({})
const columnHelper = createColumnHelper<typeof features, OrdenTrabajo>()

const columns = columnHelper.columns([
  columnHelper.accessor('numero_ot', {
    header: 'N.º OT',
    cell: ({ row }) => (
      <span className="font-semibold text-slate-950">{orderNumber(row.original)}</span>
    ),
  }),
  columnHelper.accessor('fecha_reporte', {
    header: 'Fecha',
    cell: ({ getValue }) => formatDate(getValue()),
  }),
  columnHelper.accessor((row) => vehicleName(row.vehiculo), {
    id: 'equipo',
    header: 'Equipo',
    cell: ({ row }) =>
      row.original.vehiculo?.id ? (
        <Link className="font-semibold text-slate-950 hover:text-emerald-700" to={`/vehiculos/${row.original.vehiculo.id}`}>
          {vehicleName(row.original.vehiculo)}
        </Link>
      ) : (
        vehicleName(row.original.vehiculo)
      ),
  }),
  columnHelper.accessor((row) => row.tipo_falla?.nombre ?? '-', {
    id: 'falla',
    header: 'Falla',
  }),
  columnHelper.accessor((row) => personName(row.tecnico), {
    id: 'tecnico',
    header: 'Técnico',
  }),
  columnHelper.accessor('estado', {
    header: 'Estado',
    cell: ({ getValue }) => <StatusBadge value={getValue()} />,
  }),
  columnHelper.accessor('estado_equipo', {
    header: 'Estado equipo',
    cell: ({ getValue }) => <StatusBadge value={getValue()} />,
  }),
  columnHelper.display({
    id: 'acciones',
    header: 'Acción',
    cell: ({ row }) => (
      <Link
        to={`/taller/ordenes/${row.original.id}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
        aria-label="Ver OT"
      >
        <MoreVertical className="h-5 w-5" aria-hidden="true" />
      </Link>
    ),
  }),
])

const emptyOrders: OrdenTrabajo[] = []

export function OrdenesTable({ data = emptyOrders }: { data?: OrdenTrabajo[] }) {
  const table = useTable({ features, columns, data })

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead className="bg-white text-xs font-black uppercase text-slate-500">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="border-b border-slate-100 px-5 py-4">
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-emerald-50/25">
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-4 align-middle text-slate-700">
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm font-medium text-slate-500">
                  No hay órdenes para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
