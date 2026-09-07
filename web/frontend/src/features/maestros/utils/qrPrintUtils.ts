import QRCode from 'qrcode'
import type { VehiculoMaster } from '../types'
import { relationLabel } from '../components/MaestrosHelpers'

export async function generateVehicleQrDataUrl(code: string, width = 300): Promise<string> {
  return QRCode.toDataURL(code, {
    width,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
}

function printHtmlViaIframe(htmlContent: string) {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'

  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentWindow?.document
  if (!iframeDoc) {
    iframe.remove()
    return
  }

  iframeDoc.open()
  iframeDoc.write(htmlContent)
  iframeDoc.close()

  iframe.contentWindow?.focus()

  // Allow images/content to render before printing
  setTimeout(() => {
    try {
      iframe.contentWindow?.print()
    } finally {
      setTimeout(() => {
        iframe.remove()
      }, 1500)
    }
  }, 350)
}

function buildSingleLabelHtml(vehicle: VehiculoMaster, qrDataUrl: string): string {
  const sedeText = relationLabel(vehicle.sede)
  const tipoText = vehicle.tipo_vehiculo?.nombre ?? 'Vehículo'
  const modeloText = [vehicle.marca, vehicle.modelo].filter(Boolean).join(' ') || (vehicle.nombre ?? '-')
  const placaText = vehicle.placa ? `Placa: ${vehicle.placa}` : ''

  return `
    <div class="label-card single-label">
      <div class="label-header">
        <span class="label-badge">CONTROL DE FLOTA</span>
        <span class="label-meta">${sedeText !== '-' ? sedeText : 'TALLER CENTRAL'}</span>
      </div>
      <div class="label-body">
        <div class="qr-container">
          <img src="${qrDataUrl}" alt="QR ${vehicle.codigo}" class="qr-image" />
        </div>
        <div class="label-code">${vehicle.codigo}</div>
        <div class="label-type">${tipoText}</div>
        <div class="label-details">
          <div>${modeloText}</div>
          ${placaText ? `<div><strong>${placaText}</strong></div>` : ''}
        </div>
      </div>
      <div class="label-footer">
        <span>SISTEMA TALLER Y HORÓMETROS</span>
      </div>
    </div>
  `
}

function buildLabelCardHtml(vehicle: VehiculoMaster, qrDataUrl: string): string {
  const sedeText = relationLabel(vehicle.sede)
  const tipoText = vehicle.tipo_vehiculo?.nombre ?? 'Vehículo'
  const modeloText = [vehicle.marca, vehicle.modelo].filter(Boolean).join(' ') || (vehicle.nombre ?? '')

  return `
    <div class="label-card">
      <div class="label-header">
        <span class="label-badge">${tipoText.toUpperCase()}</span>
        <span class="label-meta">${sedeText !== '-' ? sedeText : ''}</span>
      </div>
      <div class="label-body">
        <div class="qr-container">
          <img src="${qrDataUrl}" alt="QR ${vehicle.codigo}" class="qr-image" />
        </div>
        <div class="label-code">${vehicle.codigo}</div>
        ${vehicle.placa ? `<div class="label-plate">Placa: ${vehicle.placa}</div>` : ''}
        ${modeloText ? `<div class="label-details">${modeloText}</div>` : ''}
      </div>
      <div class="label-footer">
        <span>TALLER &bull; HORÓMETRO</span>
      </div>
    </div>
  `
}

const basePrintStyles = `
  @page {
    size: auto;
    margin: 8mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .label-card {
    border: 1.5px dashed #64748b;
    border-radius: 8px;
    padding: 10px;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .single-label-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
  }
  .single-label {
    width: 280px;
    max-width: 100%;
    border: 2px solid #0f172a;
    border-radius: 12px;
    padding: 16px 14px;
    box-shadow: none;
  }
  .label-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 4px;
    margin-bottom: 6px;
    font-size: 8.5pt;
  }
  .label-badge {
    font-weight: 800;
    letter-spacing: 0.5px;
    color: #047857;
  }
  .label-meta {
    font-size: 7.5pt;
    font-weight: 600;
    color: #64748b;
  }
  .label-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding: 4px 0;
  }
  .qr-container {
    background: #ffffff;
    padding: 4px;
    border-radius: 6px;
    display: inline-block;
  }
  .qr-image {
    width: 135px;
    height: 135px;
    display: block;
  }
  .single-label .qr-image {
    width: 170px;
    height: 170px;
  }
  .label-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 19pt;
    font-weight: 900;
    letter-spacing: 1px;
    color: #020617;
    margin-top: 4px;
    line-height: 1.1;
  }
  .single-label .label-code {
    font-size: 24pt;
    margin-top: 6px;
  }
  .label-plate {
    font-size: 9.5pt;
    font-weight: 700;
    color: #334155;
    margin-top: 2px;
  }
  .label-type {
    font-size: 9pt;
    font-weight: 600;
    color: #475569;
    margin-top: 2px;
  }
  .label-details {
    font-size: 8.5pt;
    color: #64748b;
    margin-top: 3px;
    max-width: 95%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .label-footer {
    width: 100%;
    border-top: 1px solid #e2e8f0;
    padding-top: 4px;
    margin-top: 6px;
    font-size: 7pt;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.5px;
  }
  .bulk-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8mm;
    width: 100%;
  }
  @media print {
    body {
      background: none;
    }
    .label-card {
      border-color: #334155;
    }
  }
`

export function printSingleVehicleQr(vehicle: VehiculoMaster, qrDataUrl: string) {
  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>QR ${vehicle.codigo}</title>
        <style>${basePrintStyles}</style>
      </head>
      <body>
        <div class="single-label-wrapper">
          ${buildSingleLabelHtml(vehicle, qrDataUrl)}
        </div>
      </body>
    </html>
  `
  printHtmlViaIframe(html)
}

export function printBulkVehicleQrs(items: Array<{ vehicle: VehiculoMaster; qrDataUrl: string }>) {
  const labelsHtml = items.map((item) => buildLabelCardHtml(item.vehicle, item.qrDataUrl)).join('')

  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Impresión Masiva de QRs - Flota</title>
        <style>${basePrintStyles}</style>
      </head>
      <body>
        <div class="bulk-grid">
          ${labelsHtml}
        </div>
      </body>
    </html>
  `
  printHtmlViaIframe(html)
}
