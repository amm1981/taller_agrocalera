import { useEffect, useState } from 'react'
import { Download, Printer, QrCode, X } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import type { VehiculoMaster } from '../types'
import { masterStatus, recordTitle, relationLabel } from './MaestrosHelpers'
import { generateVehicleQrDataUrl, printSingleVehicleQr } from '../utils/qrPrintUtils'

interface VehicleQrModalProps {
  vehicle: VehiculoMaster | null
  isOpen: boolean
  onClose: () => void
}

export function VehicleQrModal({ vehicle, isOpen, onClose }: VehicleQrModalProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!isOpen || !vehicle) {
      setQrUrl(null)
      return
    }

    let isMounted = true
    setIsGenerating(true)

    generateVehicleQrDataUrl(vehicle.codigo, 320)
      .then((url) => {
        if (isMounted) {
          setQrUrl(url)
          setIsGenerating(false)
        }
      })
      .catch((error) => {
        console.error('Error generating QR code:', error)
        if (isMounted) {
          setIsGenerating(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, vehicle])

  if (!isOpen || !vehicle) {
    return null
  }

  const handlePrint = () => {
    if (!qrUrl) return
    printSingleVehicleQr(vehicle, qrUrl)
  }

  const handleDownload = () => {
    if (!qrUrl) return
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `QR_${vehicle.codigo}.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 shadow-xs">
              <QrCode className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-950">Código QR del Tractor</h3>
              <p className="text-xs font-semibold text-slate-500">
                Código para control de horómetro y taller
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

        {/* Modal Body */}
        <div className="p-6">
          <div className="flex flex-col items-center">
            {/* QR Card Container */}
            <div className="flex flex-col items-center rounded-2xl border-2 border-slate-200 bg-slate-50/50 p-6 shadow-inner w-full max-w-[280px]">
              <div className="text-center mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {vehicle.tipo_vehiculo?.nombre ?? 'Tractor'}
                </span>
              </div>

              <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl bg-white p-2 shadow-xs border border-slate-200">
                {isGenerating || !qrUrl ? (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                    <span className="text-xs font-medium">Generando QR...</span>
                  </div>
                ) : (
                  <img
                    src={qrUrl}
                    alt={`QR ${vehicle.codigo}`}
                    className="h-full w-full object-contain"
                  />
                )}
              </div>

              <div className="mt-3 text-center">
                <span className="font-mono text-2xl font-black tracking-wide text-slate-950">
                  {vehicle.codigo}
                </span>
                {vehicle.placa && (
                  <div className="text-xs font-bold text-slate-600 mt-0.5">
                    Placa: {vehicle.placa}
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Metadata Summary */}
            <div className="mt-5 w-full rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Equipo</span>
                  <span className="font-bold text-slate-900">{recordTitle(vehicle)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Sede</span>
                  <span className="font-semibold text-slate-800">{relationLabel(vehicle.sede)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Marca / Modelo</span>
                  <span className="font-semibold text-slate-800">
                    {[vehicle.marca, vehicle.modelo].filter(Boolean).join(' ') || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Estado</span>
                  <div className="mt-0.5">{masterStatus(vehicle.estado)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleDownload}
            disabled={!qrUrl}
            className="text-xs"
          >
            <Download className="h-4 w-4" />
            Descargar PNG
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="text-xs">
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              disabled={!qrUrl}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Imprimir QR
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
