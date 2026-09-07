import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  CarFront,
  Download,
  Factory,
  FileUp,
  Layers3,
  MapPinned,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Tag,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { FilterField, inputClass } from '../features/taller/components/FilterField'
import {
  createMasterRecord,
  downloadPersonalImportTemplate,
  downloadVehicleImportTemplate as downloadVehicleImportTemplateFile,
  getFundosMaster,
  getGerenciasMaster,
  getLotesMaster,
  getMasterRecords,
  getSectoresMaster,
  getSedesMaster,
  getTiposVehiculoMaster,
  importPersonalMasters,
  importVehicleMasters,
  updateMasterRecord,
} from '../features/maestros/maestrosService'
import { masterStatus, recordTitle, relationLabel } from '../features/maestros/components/MaestrosHelpers'
import { VehicleQrModal } from '../features/maestros/components/VehicleQrModal'
import { VehicleBulkQrModal } from '../features/maestros/components/VehicleBulkQrModal'
import type {
  MasterLookups,
  MasterPayload,
  MasterRecord,
  MasterTabKey,
  PersonalImportRow,
  PersonalImportSummary,
  VehicleImportRow,
  VehicleImportSummary,
  VehiculoMaster,
} from '../features/maestros/types'
import { AppLayout } from '../layouts/AppLayout'

type FieldConfig = {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'checkbox'
  required?: boolean
  nullable?: boolean
  options?: Array<{ value: string | number; label: string }>
}

type TabConfig = {
  key: MasterTabKey
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  description: string
}

type ExcelCell = string | number | boolean | Date | null

const tabs: TabConfig[] = [
  { key: 'vehiculos', label: 'Vehículos', icon: CarFront, description: 'Equipos de la flota' },
  { key: 'personal', label: 'Personal', icon: UserRound, description: 'Operarios, técnicos y responsables' },
  { key: 'gerencias', label: 'Gerencias', icon: Building2, description: 'Áreas administrativas y campo' },
  { key: 'sedes', label: 'Sedes', icon: Factory, description: 'Ubicaciones principales' },
  { key: 'fundos', label: 'Fundos', icon: MapPinned, description: 'Fundos asociados a sedes' },
  { key: 'sectores', label: 'Sectores', icon: Layers3, description: 'Sectores por fundo' },
  { key: 'lotes', label: 'Lotes', icon: Tag, description: 'Lotes por sector' },
  { key: 'tipos-vehiculo', label: 'Tipos vehículo', icon: Wrench, description: 'Clasificación y reglas de horómetro' },
  { key: 'tipos-falla', label: 'Tipos falla', icon: Wrench, description: 'Catálogo de fallas para taller' },
]

const tabKeys = tabs.map((tab) => tab.key)

function parseMasterTab(value: string | null): MasterTabKey {
  return tabKeys.includes(value as MasterTabKey) ? value as MasterTabKey : 'vehiculos'
}

const personTypes = ['OPERARIO', 'TECNICO', 'RESPONSABLE', 'CONDUCTOR', 'OTRO']
const activeStates = ['ACTIVO', 'INACTIVO']
const vehicleImportColumns: Array<keyof VehicleImportRow> = [
  'codigo',
  'tipo_vehiculo',
  'placa',
  'nombre',
  'marca',
  'modelo',
  'sede',
  'horometro_base',
]
const personalImportColumns: Array<keyof PersonalImportRow> = [
  'dni',
  'nombres',
  'apellidos',
  'tipo',
  'gerencia',
  'sede',
  'estado',
]
function emptyPayloadFor(tab: MasterTabKey): MasterPayload {
  if (tab === 'vehiculos') {
    return {
      codigo: '',
      placa: '',
      nombre: '',
      tipo_vehiculo_id: '',
      marca: '',
      modelo: '',
      sede_id: '',
      horometro_base: '',
    }
  }

  if (tab === 'personal') {
    return {
      dni: '',
      nombres: '',
      apellidos: '',
      tipo: 'OPERARIO',
      gerencia_id: '',
      sede_id: '',
      estado: 'ACTIVO',
    }
  }

  if (tab === 'tipos-vehiculo') {
    return {
      nombre: '',
      requiere_horometro: true,
      requiere_login_horometro: false,
      estado: 'ACTIVO',
    }
  }

  if (tab === 'tipos-falla') {
    return {
      nombre: '',
      estado: 'ACTIVO',
    }
  }

  if (tab === 'fundos') {
    return { sede_id: '', codigo: '', nombre: '', estado: 'ACTIVO' }
  }

  if (tab === 'sectores') {
    return { fundo_id: '', codigo: '', nombre: '', estado: 'ACTIVO' }
  }

  if (tab === 'lotes') {
    return { sector_id: '', codigo: '', nombre: '', estado: 'ACTIVO' }
  }

  return { codigo: '', nombre: '', estado: 'ACTIVO' }
}

function fieldsFor(tab: MasterTabKey, lookups: MasterLookups): FieldConfig[] {
  const gerenciaOptions = lookups.gerencias.map((item) => ({ value: item.id, label: relationLabel(item) }))
  const sedeOptions = lookups.sedes.map((item) => ({ value: item.id, label: relationLabel(item) }))
  const sectorOptions = lookups.sectores.map((item) => ({ value: item.id, label: relationLabel(item) }))
  const fundoOptions = lookups.fundos.map((item) => ({ value: item.id, label: relationLabel(item) }))
  const tipoVehiculoOptions = lookups.tiposVehiculo.map((item) => ({ value: item.id, label: item.nombre }))
  const estadoOptions = activeStates.map((state) => ({ value: state, label: state }))

  if (tab === 'vehiculos') {
    return [
      { name: 'codigo', label: 'Código', type: 'text', required: true },
      { name: 'placa', label: 'Placa', type: 'text', nullable: true },
      { name: 'nombre', label: 'Nombre', type: 'text', nullable: true },
      { name: 'tipo_vehiculo_id', label: 'Tipo vehículo', type: 'select', required: true, options: tipoVehiculoOptions },
      { name: 'marca', label: 'Marca', type: 'text', nullable: true },
      { name: 'modelo', label: 'Modelo', type: 'text', nullable: true },
      { name: 'sede_id', label: 'Sede base', type: 'select', required: true, options: sedeOptions },
      { name: 'horometro_base', label: 'Horómetro base', type: 'number', nullable: true },
    ]
  }

  if (tab === 'personal') {
    return [
      { name: 'dni', label: 'DNI', type: 'text', required: true },
      { name: 'nombres', label: 'Nombres', type: 'text', required: true },
      { name: 'apellidos', label: 'Apellidos', type: 'text', required: true },
      { name: 'tipo', label: 'Tipo', type: 'select', required: true, options: personTypes.map((type) => ({ value: type, label: type })) },
      { name: 'gerencia_id', label: 'Gerencia', type: 'select', nullable: true, options: gerenciaOptions },
      { name: 'sede_id', label: 'Sede', type: 'select', nullable: true, options: sedeOptions },
      { name: 'estado', label: 'Estado', type: 'select', required: true, options: estadoOptions },
    ]
  }

  if (tab === 'tipos-vehiculo') {
    return [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'requiere_horometro', label: 'Requiere horómetro', type: 'checkbox' },
      { name: 'requiere_login_horometro', label: 'Requiere login horómetro', type: 'checkbox' },
      { name: 'estado', label: 'Estado', type: 'select', options: estadoOptions },
    ]
  }

  if (tab === 'tipos-falla') {
    return [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'estado', label: 'Estado', type: 'select', options: estadoOptions },
    ]
  }

  if (tab === 'fundos') {
    return [
      { name: 'sede_id', label: 'Sede', type: 'select', required: true, options: sedeOptions },
      { name: 'codigo', label: 'Código', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'estado', label: 'Estado', type: 'select', options: estadoOptions },
    ]
  }

  if (tab === 'sectores') {
    return [
      { name: 'fundo_id', label: 'Fundo', type: 'select', required: true, options: fundoOptions },
      { name: 'codigo', label: 'Código', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'estado', label: 'Estado', type: 'select', options: estadoOptions },
    ]
  }

  if (tab === 'lotes') {
    return [
      { name: 'sector_id', label: 'Sector', type: 'select', required: true, options: sectorOptions },
      { name: 'codigo', label: 'Código', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'estado', label: 'Estado', type: 'select', options: estadoOptions },
    ]
  }

  return [
    { name: 'codigo', label: 'Código', type: 'text', required: true },
    { name: 'nombre', label: 'Nombre', type: 'text', required: true },
    { name: 'estado', label: 'Estado', type: 'select', options: estadoOptions },
  ]
}

function normalizePayload(payload: MasterPayload, fields: FieldConfig[]) {
  return fields.reduce<MasterPayload>((accumulator, field) => {
    const value = payload[field.name]

    if (field.type === 'checkbox') {
      accumulator[field.name] = Boolean(value)
      return accumulator
    }

    if (field.nullable && value === '') {
      accumulator[field.name] = null
      return accumulator
    }

    if ((field.type === 'number' || field.name.endsWith('_id')) && value !== '') {
      accumulator[field.name] = Number(value)
      return accumulator
    }

    accumulator[field.name] = value

    return accumulator
  }, {})
}

function cellText(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'object') {
    const candidate = value as { text?: unknown; result?: unknown; richText?: Array<{ text?: string }> }

    if (candidate.text !== undefined) {
      return cellText(candidate.text)
    }

    if (candidate.result !== undefined) {
      return cellText(candidate.result)
    }

    if (Array.isArray(candidate.richText)) {
      return candidate.richText.map((part) => part.text ?? '').join('').trim()
    }
  }

  return String(value).trim()
}

async function parseImportWorkbook<T extends Record<string, string>>(
  file: File,
  columns: Array<keyof T>,
  requiredColumns: Array<keyof T>,
  rowIdentifier: keyof T,
): Promise<T[]> {
  const { readSheet } = await import('read-excel-file/browser')
  const rawRows = await readSheet(file) as ExcelCell[][]

  if (!rawRows.length) {
    throw new Error('El archivo Excel no contiene filas.')
  }

  const headerRow = rawRows[0].map(cellText)
  const missing = requiredColumns.map(String).filter((column) => !headerRow.includes(column))

  if (missing.length) {
    throw new Error(`Faltan columnas: ${missing.join(', ')}`)
  }

  const rows: T[] = []

  rawRows.slice(1).forEach((rawRow: ExcelCell[]) => {
    const row = headerRow.reduce<Partial<T>>((accumulator, header, index) => {
      if (columns.includes(header as keyof T)) {
        const value = cellText(rawRow[index])

        if (value !== '') {
          accumulator[header as keyof T] = value as T[keyof T]
        }
      }

      return accumulator
    }, {})

    if (row[rowIdentifier]) {
      rows.push(row as T)
    }
  })

  if (!rows.length) {
    throw new Error('El archivo Excel no contiene filas para importar.')
  }

  return rows
}

function parseVehicleImportWorkbook(file: File): Promise<VehicleImportRow[]> {
  return parseImportWorkbook<VehicleImportRow>(file, vehicleImportColumns, ['codigo', 'tipo_vehiculo', 'sede'], 'codigo')
}

function parsePersonalImportWorkbook(file: File): Promise<PersonalImportRow[]> {
  return parseImportWorkbook<PersonalImportRow>(
    file,
    personalImportColumns,
    ['dni', 'nombres', 'apellidos', 'tipo'],
    'dni',
  )
}

export function MaestrosPage() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const activeTab = parseMasterTab(searchParams.get('tab'))
  const [filters, setFilters] = useState({ q: '', estado: '', per_page: 50 })
  const [editing, setEditing] = useState<MasterRecord | null>(null)
  const [form, setForm] = useState<MasterPayload>(() => emptyPayloadFor('vehiculos'))
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [vehicleImportRows, setVehicleImportRows] = useState<VehicleImportRow[]>([])
  const [vehicleImportFileName, setVehicleImportFileName] = useState<string | null>(null)
  const [vehicleImportError, setVehicleImportError] = useState<string | null>(null)
  const [vehicleImportSummary, setVehicleImportSummary] = useState<VehicleImportSummary | null>(null)
  const [personalImportRows, setPersonalImportRows] = useState<PersonalImportRow[]>([])
  const [personalImportFileName, setPersonalImportFileName] = useState<string | null>(null)
  const [personalImportError, setPersonalImportError] = useState<string | null>(null)
  const [personalImportSummary, setPersonalImportSummary] = useState<PersonalImportSummary | null>(null)
  const [selectedQrVehicle, setSelectedQrVehicle] = useState<VehiculoMaster | null>(null)
  const [isBulkQrOpen, setIsBulkQrOpen] = useState(false)

  const records = useQuery({
    queryKey: ['maestros', activeTab, filters],
    queryFn: () => getMasterRecords(activeTab, filters),
  })
  const gerencias = useQuery({ queryKey: ['maestros-gerencias-lookup'], queryFn: getGerenciasMaster })
  const sedes = useQuery({ queryKey: ['maestros-sedes-lookup'], queryFn: getSedesMaster })
  const fundos = useQuery({ queryKey: ['maestros-fundos-lookup'], queryFn: getFundosMaster })
  const sectores = useQuery({ queryKey: ['maestros-sectores-lookup'], queryFn: getSectoresMaster })
  const lotes = useQuery({ queryKey: ['maestros-lotes-lookup'], queryFn: getLotesMaster })
  const tiposVehiculo = useQuery({ queryKey: ['maestros-tipos-vehiculo-lookup'], queryFn: getTiposVehiculoMaster })

  const lookups = useMemo<MasterLookups>(() => ({
    gerencias: gerencias.data ?? [],
    sedes: sedes.data ?? [],
    fundos: fundos.data ?? [],
    sectores: sectores.data ?? [],
    lotes: lotes.data ?? [],
    tiposVehiculo: tiposVehiculo.data ?? [],
  }), [fundos.data, gerencias.data, lotes.data, sectores.data, sedes.data, tiposVehiculo.data])

  const fields = useMemo(() => fieldsFor(activeTab, lookups), [activeTab, lookups])
  const active = tabs.find((tab) => tab.key === activeTab) ?? tabs[0]

  useEffect(() => {
    setEditing(null)
    setForm(emptyPayloadFor(activeTab))
    setIsFormOpen(false)
    setFilters({ q: '', estado: '', per_page: 50 })
  }, [activeTab])

  const save = useMutation({
    mutationFn: () => {
      const payload = normalizePayload(form, fields)

      if (editing) {
        return updateMasterRecord(activeTab, editing.id, payload)
      }

      return createMasterRecord(activeTab, payload)
    },
    onSuccess: async () => {
      setEditing(null)
      setForm(emptyPayloadFor(activeTab))
      setIsFormOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['maestros'] })
      await queryClient.invalidateQueries({ queryKey: ['maestros-gerencias-lookup'] })
      await queryClient.invalidateQueries({ queryKey: ['maestros-sedes-lookup'] })
      await queryClient.invalidateQueries({ queryKey: ['maestros-fundos-lookup'] })
      await queryClient.invalidateQueries({ queryKey: ['maestros-sectores-lookup'] })
      await queryClient.invalidateQueries({ queryKey: ['maestros-lotes-lookup'] })
      await queryClient.invalidateQueries({ queryKey: ['maestros-tipos-vehiculo-lookup'] })
      await queryClient.invalidateQueries({ queryKey: ['vehiculos'] })
      await queryClient.invalidateQueries({ queryKey: ['gerencias'] })
      await queryClient.invalidateQueries({ queryKey: ['tecnicos'] })
      await queryClient.invalidateQueries({ queryKey: ['operarios'] })
    },
  })

  const importVehicles = useMutation({
    mutationFn: () => {
      if (!vehicleImportRows.length) {
        throw new Error('Selecciona un archivo .xlsx antes de importar.')
      }

      return importVehicleMasters(vehicleImportRows)
    },
    onMutate: () => {
      setVehicleImportError(null)
      setVehicleImportSummary(null)
    },
    onSuccess: async (summary) => {
      setVehicleImportSummary(summary)
      await queryClient.invalidateQueries({ queryKey: ['maestros'] })
      await queryClient.invalidateQueries({ queryKey: ['maestros-tipos-vehiculo-lookup'] })
      await queryClient.invalidateQueries({ queryKey: ['vehiculos'] })
    },
    onError: (error) => {
      setVehicleImportError(error instanceof Error ? error.message : 'No se pudieron importar los vehículos.')
    },
  })

  const importPersonal = useMutation({
    mutationFn: () => {
      if (!personalImportRows.length) {
        throw new Error('Selecciona un archivo .xlsx antes de importar.')
      }

      return importPersonalMasters(personalImportRows)
    },
    onMutate: () => {
      setPersonalImportError(null)
      setPersonalImportSummary(null)
    },
    onSuccess: async (summary) => {
      setPersonalImportSummary(summary)
      await queryClient.invalidateQueries({ queryKey: ['maestros'] })
      await queryClient.invalidateQueries({ queryKey: ['personal'] })
      await queryClient.invalidateQueries({ queryKey: ['operarios'] })
      await queryClient.invalidateQueries({ queryKey: ['tecnicos'] })
    },
    onError: (error) => {
      setPersonalImportError(error instanceof Error ? error.message : 'No se pudo importar el personal.')
    },
  })

  const downloadVehicleImportTemplate = async () => {
    const blob = await downloadVehicleImportTemplateFile()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'importador_vehiculos.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const downloadPersonalImportTemplateFile = async () => {
    const blob = await downloadPersonalImportTemplate()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'importador_personal.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleVehicleImportFile = async (file: File | null) => {
    setVehicleImportError(null)
    setVehicleImportSummary(null)

    if (!file) {
      setVehicleImportRows([])
      setVehicleImportFileName(null)
      return
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setVehicleImportRows([])
      setVehicleImportFileName(null)
      setVehicleImportError('El importador debe ser un archivo .xlsx.')
      return
    }

    try {
      const rows = await parseVehicleImportWorkbook(file)

      setVehicleImportRows(rows)
      setVehicleImportFileName(file.name)
    } catch (error) {
      setVehicleImportRows([])
      setVehicleImportFileName(file.name)
      setVehicleImportError(error instanceof Error ? error.message : 'No se pudo leer el archivo Excel.')
    }
  }

  const handlePersonalImportFile = async (file: File | null) => {
    setPersonalImportError(null)
    setPersonalImportSummary(null)

    if (!file) {
      setPersonalImportRows([])
      setPersonalImportFileName(null)
      return
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setPersonalImportRows([])
      setPersonalImportFileName(null)
      setPersonalImportError('El importador debe ser un archivo .xlsx.')
      return
    }

    try {
      const rows = await parsePersonalImportWorkbook(file)

      setPersonalImportRows(rows)
      setPersonalImportFileName(file.name)
    } catch (error) {
      setPersonalImportRows([])
      setPersonalImportFileName(file.name)
      setPersonalImportError(error instanceof Error ? error.message : 'No se pudo leer el archivo Excel.')
    }
  }

  const startEdit = (record: MasterRecord) => {
    const next = emptyPayloadFor(activeTab)

    Object.keys(next).forEach((key) => {
      const value = (record as unknown as MasterPayload)[key]
      next[key] = value ?? ''
    })

    setEditing(record)
    setForm(next)
    save.reset()
    setIsFormOpen(true)
  }

  const startCreate = () => {
    setEditing(null)
    setForm(emptyPayloadFor(activeTab))
    save.reset()
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setEditing(null)
    setForm(emptyPayloadFor(activeTab))
    save.reset()
    setIsFormOpen(false)
  }

  return (
    <AppLayout title="Maestros" description="Catálogos compartidos para flota, taller y horómetros">
      <div className="grid gap-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-950">{active.label}</h2>
                <p className="text-sm font-medium text-slate-500">{active.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void records.refetch()} disabled={records.isFetching}>
                  <RefreshCw className={`h-4 w-4 ${records.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
                  Actualizar
                </Button>
                {activeTab === 'vehiculos' ? (
                  <Button variant="secondary" onClick={() => setIsBulkQrOpen(true)}>
                    <Printer className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    Imprimir QRs masivo
                  </Button>
                ) : null}
                <Button onClick={startCreate}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Nuevo registro
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_120px]">
              <FilterField label="Buscar">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    className={`${inputClass} w-full pl-9`}
                    value={filters.q}
                    onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                    placeholder="Código, nombre, DNI o placa"
                  />
                </div>
              </FilterField>
              <FilterField label="Estado">
                <select className={inputClass} value={filters.estado} onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value }))}>
                  <option value="">Todos</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </FilterField>
              <div className="flex items-end">
                <Button variant="secondary" className="w-full" onClick={() => setFilters({ q: '', estado: '', per_page: 50 })}>
                  Limpiar
                </Button>
              </div>
            </div>
        </section>

        {activeTab === 'vehiculos' ? (
          <ImportPanel
            title="Importador de vehículos"
            description="Crea o actualiza tractores y maquinaria pesada desde Excel."
            fileName={vehicleImportFileName}
            rowsCount={vehicleImportRows.length}
            onFileSelected={(file) => void handleVehicleImportFile(file)}
            onImport={() => importVehicles.mutate()}
            isLoading={importVehicles.isPending}
            error={vehicleImportError}
            stats={vehicleImportSummary ? [
              { label: 'Tipos', created: vehicleImportSummary.tipos_creados, updated: vehicleImportSummary.tipos_actualizados },
              { label: 'Vehículos', created: vehicleImportSummary.vehiculos_creados, updated: vehicleImportSummary.vehiculos_actualizados },
            ] : []}
            onDownload={() => void downloadVehicleImportTemplate()}
          />
        ) : null}

        {activeTab === 'personal' ? (
          <ImportPanel
            title="Importador de personal"
            description="Crea o actualiza operarios, técnicos y responsables desde Excel."
            fileName={personalImportFileName}
            rowsCount={personalImportRows.length}
            onFileSelected={(file) => void handlePersonalImportFile(file)}
            onImport={() => importPersonal.mutate()}
            isLoading={importPersonal.isPending}
            error={personalImportError}
            stats={personalImportSummary ? [
              { label: 'Personal', created: personalImportSummary.personal_creado, updated: personalImportSummary.personal_actualizado },
            ] : []}
            onDownload={() => void downloadPersonalImportTemplateFile()}
          />
        ) : null}

        <MasterTable
          tab={activeTab}
          records={records.data?.data ?? []}
          isLoading={records.isLoading}
          onEdit={startEdit}
          onOpenQr={(vehicle) => setSelectedQrVehicle(vehicle)}
        />
      </div>

      <VehicleQrModal
        vehicle={selectedQrVehicle}
        isOpen={Boolean(selectedQrVehicle)}
        onClose={() => setSelectedQrVehicle(null)}
      />

      <VehicleBulkQrModal
        isOpen={isBulkQrOpen}
        onClose={() => setIsBulkQrOpen(false)}
      />

      <MasterFormModal
        editing={editing}
        fields={fields}
        form={form}
        isOpen={isFormOpen}
        isSaving={save.isPending}
        hasError={save.isError}
        onClose={closeForm}
        onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
        onSubmit={() => save.mutate()}
      />
    </AppLayout>
  )
}

function MasterFormModal({
  editing,
  fields,
  form,
  isOpen,
  isSaving,
  hasError,
  onClose,
  onChange,
  onSubmit,
}: {
  editing: MasterRecord | null
  fields: FieldConfig[]
  form: MasterPayload
  isOpen: boolean
  isSaving: boolean
  hasError: boolean
  onClose: () => void
  onChange: (field: string, value: string | boolean) => void
  onSubmit: () => void
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              {editing ? <Pencil className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            </span>
            <div>
              <h3 className="text-base font-black text-slate-950">{editing ? 'Editar registro' : 'Nuevo registro'}</h3>
              <p className="text-xs font-semibold text-slate-500">Completa los campos obligatorios para guardar.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
            aria-label="Cerrar formulario"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form
          className="max-h-[calc(90vh-74px)] overflow-y-auto px-5 py-5"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {fields.map((field) => (
              <MasterField
                key={field.name}
                field={field}
                value={form[field.name]}
                onChange={(value) => onChange(field.name, value)}
              />
            ))}
          </div>

          {hasError ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              No se pudo guardar. Revisa campos obligatorios o códigos duplicados.
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Guardar
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

function ImportPanel({
  title,
  description,
  fileName,
  rowsCount,
  onFileSelected,
  onImport,
  onDownload,
  isLoading,
  error,
  stats,
}: {
  title: string
  description: string
  fileName: string | null
  rowsCount: number
  onFileSelected: (file: File | null) => void
  onImport: () => void
  onDownload: () => void
  isLoading: boolean
  error: string | null
  stats: Array<{ label: string; created: number; updated: number }>
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileUp className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <h2 className="text-base font-black text-slate-950">{title}</h2>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onDownload}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar plantilla
          </Button>
          <Button onClick={onImport} disabled={isLoading || rowsCount === 0}>
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Importar Excel
          </Button>
        </div>
      </div>

      <label className="mt-4 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-5 text-center transition-colors hover:bg-emerald-50">
        <FileUp className="h-7 w-7 text-emerald-700" aria-hidden="true" />
        <span className="mt-2 text-sm font-black text-slate-950">
          {fileName ?? 'Seleccionar archivo .xlsx'}
        </span>
        <span className="mt-1 text-xs font-semibold text-slate-500">
          {rowsCount > 0 ? `${rowsCount} filas listas para importar` : 'Usa la plantilla Excel descargable'}
        </span>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
        />
      </label>

      {stats.length ? (
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          {stats.map((stat) => (
            <ImportStat key={stat.label} label={stat.label} created={stat.created} updated={stat.updated} />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      ) : null}
    </section>
  )
}

function ImportStat({ label, created, updated }: { label: string; created: number; updated: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="block text-xs font-black uppercase text-slate-400">{label}</span>
      <span className="font-black text-slate-950">{created}</span>
      <span className="text-slate-500"> nuevos / </span>
      <span className="font-black text-slate-950">{updated}</span>
      <span className="text-slate-500"> actualizados</span>
    </div>
  )
}

function MasterField({
  field,
  value,
  onChange,
}: {
  field: FieldConfig
  value: string | number | boolean | null | undefined
  onChange: (value: string | boolean) => void
}) {
  if (field.type === 'checkbox') {
    return (
      <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        {field.label}
      </label>
    )
  }

  return (
    <FilterField label={field.label}>
      {field.type === 'select' ? (
        <select
          className={inputClass}
          required={field.required}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{field.nullable ? 'Sin asignar' : 'Seleccionar'}</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <input
          className={inputClass}
          required={field.required}
          type={field.type}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </FilterField>
  )
}

function MasterTable({
  tab,
  records,
  isLoading,
  onEdit,
  onOpenQr,
}: {
  tab: MasterTabKey
  records: MasterRecord[]
  isLoading: boolean
  onEdit: (record: MasterRecord) => void
  onOpenQr?: (vehicle: VehiculoMaster) => void
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              {headersFor(tab).map((header) => (
                <th key={header} className="border-b border-slate-200 px-4 py-3">{header}</th>
              ))}
              <th className="border-b border-slate-200 px-4 py-3">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-slate-50">
                {cellsFor(tab, record, onOpenQr).map((cell, index) => (
                  <td key={`${record.id}-${index}`} className="px-4 py-3 align-top text-slate-700">{cell}</td>
                ))}
                <td className="px-4 py-3 align-top">
                  <Button variant="secondary" onClick={() => onEdit(record)}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
            {!isLoading && !records.length ? (
              <tr>
                <td colSpan={headersFor(tab).length + 1} className="px-4 py-10 text-center text-sm text-slate-500">
                  No hay registros para este maestro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function headersFor(tab: MasterTabKey) {
  if (tab === 'vehiculos') {
    return ['Equipo', 'Tipo', 'Sede', 'Estado', 'Activo', 'QR']
  }

  if (tab === 'personal') {
    return ['Personal', 'Tipo', 'Gerencia', 'Sede', 'Estado']
  }

  if (tab === 'fundos') {
    return ['Fundo', 'Sede', 'Estado']
  }

  if (tab === 'sectores') {
    return ['Sector', 'Fundo', 'Estado']
  }

  if (tab === 'lotes') {
    return ['Lote', 'Sector', 'Estado']
  }

  if (tab === 'tipos-vehiculo') {
    return ['Tipo vehículo', 'Horómetro', 'Login horómetro', 'Estado']
  }

  return ['Registro', 'Estado']
}

function cellsFor(
  tab: MasterTabKey,
  record: MasterRecord,
  onOpenQr?: (vehicle: VehiculoMaster) => void,
) {
  if (tab === 'vehiculos' && 'tipo_vehiculo' in record) {
    const vehicle = record as VehiculoMaster

    return [
      <Link className="font-bold text-slate-950 hover:text-emerald-700" to={`/vehiculos/${record.id}`}>
        {recordTitle(record)}
      </Link>,
      record.tipo_vehiculo?.nombre ?? '-',
      relationLabel(record.sede),
      masterStatus(record.estado),
      record.activo ? 'Sí' : 'No',
      <button
        key="qr"
        type="button"
        onClick={() => onOpenQr?.(vehicle)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-xs hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
        title={`Ver e imprimir QR de ${vehicle.codigo}`}
      >
        <QrCode className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
        <span>QR</span>
      </button>,
    ]
  }

  if (tab === 'personal' && 'dni' in record) {
    return [
      <strong className="text-slate-950">{recordTitle(record)}</strong>,
      record.tipo,
      relationLabel(record.gerencia),
      relationLabel(record.sede),
      masterStatus(record.estado),
    ]
  }

  if (tab === 'fundos' && 'sede' in record) {
    return [<strong className="text-slate-950">{recordTitle(record)}</strong>, relationLabel(record.sede), masterStatus(record.estado)]
  }

  if (tab === 'sectores' && 'fundo' in record) {
    return [<strong className="text-slate-950">{recordTitle(record)}</strong>, relationLabel(record.fundo), masterStatus(record.estado)]
  }

  if (tab === 'lotes' && 'sector' in record) {
    return [<strong className="text-slate-950">{recordTitle(record)}</strong>, relationLabel(record.sector), masterStatus(record.estado)]
  }

  if (tab === 'tipos-vehiculo' && 'requiere_horometro' in record) {
    return [
      <strong className="text-slate-950">{record.nombre}</strong>,
      record.requiere_horometro ? 'Sí' : 'No',
      record.requiere_login_horometro ? 'Sí' : 'No',
      masterStatus(record.estado),
    ]
  }

  return [<strong className="text-slate-950">{recordTitle(record)}</strong>, 'estado' in record ? masterStatus(record.estado) : '-']
}
