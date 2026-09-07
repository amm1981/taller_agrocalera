import { useEffect, useMemo, useState } from 'react'
import { Filter, Loader2, Printer, QrCode, Search, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../../components/ui/button'
import type { VehiculoMaster } from '../types'
import { getAllVehiclesMaster } from '../maestrosService'
import { generateVehicleQrDataUrl, printBulkVehicleQrs } from '../utils/qrPrintUtils'
import { relationLabel } from './MaestrosHelpers'

interface VehicleBulkQrModalProps {
  isOpen: boolean
  onClose: () => void
}

export function VehicleBulkQrModal({ isOpen, onClose }: VehicleBulkQrModalProps) {
  const [filterType, setFilterType] = useState<'tractores' | 'todos'>('tractores')
  const [searchTerm, setSearchTerm] = useState('')
  const [qrMap, setQrMap] = useState<Record<string, string>>({})
  const [isGeneratingQrs, setIsGeneratingQrs] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  // Fetch all vehicles
  const vehiclesQuery = useQuery({
    queryKey: ['maestros-all-vehicles-qr'],
    queryFn: getAllVehiclesMaster,
    enabled: isOpen,
    staleTime: 60 * 1000,
  })

  const vehicles = vehiclesQuery.data ?? []

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((veh) => {
      // Filter by type
      if (filterType === 'tractores') {
        const typeName = (veh.tipo_vehiculo?.nombre ?? '').toLowerCase()
        if (!typeName.includes('tractor')) {
          return false
        }
      }

      // Filter by search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const matchCode = veh.codigo.toLowerCase().includes(q)
        const matchName = (veh.nombre ?? '').toLowerCase().includes(q)
        const matchPlaca = (veh.placa ?? '').toLowerCase().includes(q)
        const matchMarca = (veh.marca ?? '').toLowerCase().includes(q)
        const matchModelo = (veh.modelo ?? '').toLowerCase().includes(q)
        return matchCode || matchName || matchPlaca || matchMarca || matchModelo
      }

      return true
    })
  }, [vehicles, filterType, searchTerm])

  // Generate QR codes for the filtered vehicles
  useEffect(() => {
    if (!isOpen || !filteredVehicles.length) {
      return
    }

    let isMounted = true
    const codesToGenerate = filteredVehicles
      .map((v) => v.codigo)
      .filter((code) => !qrMap[code])

    if (codesToGenerate.length === 0) {
      return
    }

    setIsGeneratingQrs(true)

    Promise.all(
      codesToGenerate.map(async (code) => {
        try {
          const url = await generateVehicleQrDataUrl(code, 200)
          return { code, url }
        } catch {
          return { code, url: '' }
        }
      })
    ).then((results) => {
      if (!isMounted) return
      setQrMap((prev) => {
        const next = { ...prev }
        for (const item of results) {
          if (item.url) {
            next[item.code] = item.url
          }
        }
        return next
      })
      setIsGeneratingQrs(false)
    })

    return () => {
      isMounted = false
    }
  }, [isOpen, filteredVehicles, qrMap])

  if (!isOpen) {
    return null
  }

  const handlePrintAll = async () => {
    if (!filteredVehicles.length || isPrinting) return

    setIsPrinting(true)
    try {
      // Ensure all QRs for the filtered vehicles are ready
      const printItems: Array<{ vehicle: VehiculoMaster; qrDataUrl: string }> = []

      for (const veh of filteredVehicles) {
        let qrUrl = qrMap[veh.codigo]
        if (!qrUrl) {
          qrUrl = await generateVehicleQrDataUrl(veh.codigo, 250)
        }
        printItems.push({ vehicle: veh, qrDataUrl: qrUrl })
      }

      printBulkVehicleQrs(printItems)
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
      <div className="flex flex-col max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 shadow-xs">
              <Printer className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-950">Impresión Masiva de Códigos QR</h3>
              <p className="text-xs font-semibold text-slate-500">
                Genera e imprime etiquetas QR en cuadrícula optimizada para corte y rotulado
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by vehicle type */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterType('tractores')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                  filterType === 'tractores'
                    ? 'bg-white text-emerald-800 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                Solo Tractores
              </button>
              <button
                type="button"
                onClick={() => setFilterType('todos')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                  filterType === 'todos'
                    ? 'bg-white text-emerald-800 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Toda la Flota
              </button>
            </div>

            {/* Quick search */}
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar código o modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              <QrCode className="h-3.5 w-3.5 text-emerald-600" />
              {filteredVehicles.length} {filteredVehicles.length === 1 ? 'etiqueta' : 'etiquetas'}
            </span>
          </div>
        </div>

        {/* Content Body / Grid Preview */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          {vehiclesQuery.isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="mt-3 text-sm font-semibold">Cargando catálogo de vehículos...</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
              <QrCode className="h-12 w-12 stroke-1 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-600">No se encontraron vehículos para imprimir</p>
              <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o el término de búsqueda.</p>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Vista previa de etiquetas (se imprimirán 3 por fila en hoja estándar):</span>
                {isGeneratingQrs && (
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generando códigos QR...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredVehicles.map((vehicle) => {
                  const qr = qrMap[vehicle.codigo]
                  const tipoNombre = vehicle.tipo_vehiculo?.nombre ?? 'Vehículo'

                  return (
                    <div
                      key={vehicle.id}
                      className="flex flex-col items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-shadow hover:shadow-md hover:border-emerald-300"
                    >
                      <div className="w-full flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wide border-b border-slate-100 pb-1.5 mb-2">
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px]">
                          {tipoNombre}
                        </span>
                        <span className="text-slate-400 truncate max-w-[100px]" title={relationLabel(vehicle.sede)}>
                          {relationLabel(vehicle.sede)}
                        </span>
                      </div>

                      <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-slate-50 p-1.5 border border-slate-100">
                        {qr ? (
                          <img src={qr} alt={vehicle.codigo} className="h-full w-full object-contain" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        )}
                      </div>

                      <div className="mt-2 text-center w-full">
                        <span className="font-mono text-base font-black tracking-wider text-slate-950 block">
                          {vehicle.codigo}
                        </span>
                        <p className="text-[11px] font-semibold text-slate-500 truncate" title={vehicle.nombre ?? vehicle.modelo ?? ''}>
                          {[vehicle.marca, vehicle.modelo].filter(Boolean).join(' ') || (vehicle.nombre ?? '')}
                        </p>
                        {vehicle.placa && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {vehicle.placa}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
          <p className="text-xs text-slate-500 font-medium hidden sm:block">
            El diseño incluye guías de corte y márgenes aptos para impresoras estándar y térmicas.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="secondary" onClick={onClose} className="text-xs">
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={handlePrintAll}
              disabled={filteredVehicles.length === 0 || isPrinting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparando impresión...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  Imprimir {filteredVehicles.length} {filteredVehicles.length === 1 ? 'QR' : 'QRs'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
