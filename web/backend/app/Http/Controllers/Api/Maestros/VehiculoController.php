<?php

namespace App\Http\Controllers\Api\Maestros;

use App\Domain\Mantenimiento\Services\PreventivoService;
use App\Http\Controllers\Api\Concerns\FormatsApiPagination;
use App\Http\Controllers\Controller;
use App\Models\HorometroRegistro;
use App\Models\OrdenTrabajo;
use App\Models\SolicitudRepuesto;
use App\Models\Sede;
use App\Models\TipoVehiculo;
use App\Models\Vehiculo;
use App\Support\SimpleXlsx;
use Illuminate\Support\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class VehiculoController extends Controller
{
    use FormatsApiPagination;

    public function __construct(private readonly PreventivoService $preventivoService)
    {
    }

    public function index(Request $request): array
    {
        $query = Vehiculo::query()
            ->with(['tipoVehiculo', 'gerencia', 'sede', 'fundo', 'sector', 'lote'])
            ->when($request->string('q')->toString(), function (Builder $q, string $search) {
                $q->where(function (Builder $nested) use ($search) {
                    $nested
                        ->where('codigo', 'like', "%{$search}%")
                        ->orWhere('placa', 'like', "%{$search}%")
                        ->orWhere('nombre', 'like', "%{$search}%");
                });
            });

        foreach (['gerencia_id', 'sede_id', 'fundo_id', 'sector_id', 'lote_id', 'tipo_vehiculo_id'] as $filter) {
            $query->when($request->integer($filter), fn (Builder $q, int $value) => $q->where($filter, $value));
        }

        $query
            ->when($request->string('estado')->toString(), fn (Builder $q, string $estado) => $q->where('estado', $estado))
            ->when($request->has('activo'), fn (Builder $q) => $q->where('activo', $request->boolean('activo')));

        return $this->paginated($query->orderBy('codigo')->paginate($this->perPage()));
    }

    public function show(Vehiculo $vehiculo): array
    {
        return [
            'data' => $vehiculo->load(['tipoVehiculo', 'gerencia', 'sede', 'fundo', 'sector', 'lote']),
        ];
    }

    public function trazabilidad(Vehiculo $vehiculo): array
    {
        $vehiculo->load(['tipoVehiculo', 'gerencia', 'sede', 'fundo', 'sector', 'lote']);

        $ultimoRegistro = HorometroRegistro::query()
            ->where('vehiculo_id', $vehiculo->id)
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->first();

        $ordenesAbiertas = ['PENDIENTE', 'EN_CURSO', 'ESPERANDO_REPUESTO', 'FINALIZADA_CON_PENDIENTE'];
        $estadosObservados = ['SIN_INICIO', 'SIN_CIERRE', 'INCONSISTENCIA', 'OBSERVADO'];
        $desde30Dias = Carbon::now()->subDays(30)->toDateString();

        $totalHoras = (float) HorometroRegistro::query()
            ->where('vehiculo_id', $vehiculo->id)
            ->whereNotNull('horas_trabajadas')
            ->sum('horas_trabajadas');

        $horas30Dias = (float) HorometroRegistro::query()
            ->where('vehiculo_id', $vehiculo->id)
            ->whereDate('fecha', '>=', $desde30Dias)
            ->whereNotNull('horas_trabajadas')
            ->sum('horas_trabajadas');

        $registrosCompletos = HorometroRegistro::query()
            ->where('vehiculo_id', $vehiculo->id)
            ->where('estado', 'COMPLETO')
            ->count();

        $registrosObservados = HorometroRegistro::query()
            ->where('vehiculo_id', $vehiculo->id)
            ->whereIn('estado', $estadosObservados)
            ->count();

        $ordenesTotales = OrdenTrabajo::query()
            ->where('vehiculo_id', $vehiculo->id)
            ->count();

        $ordenesAbiertasTotal = OrdenTrabajo::query()
            ->where('vehiculo_id', $vehiculo->id)
            ->whereIn('estado', $ordenesAbiertas)
            ->count();

        $ordenes30Dias = OrdenTrabajo::query()
            ->where('vehiculo_id', $vehiculo->id)
            ->whereDate('fecha_reporte', '>=', $desde30Dias)
            ->count();

        $repuestosPendientes = SolicitudRepuesto::query()
            ->whereIn('estado', ['SOLICITADO', 'DISPONIBLE'])
            ->whereHas('ordenTrabajo', fn (Builder $query) => $query->where('vehiculo_id', $vehiculo->id))
            ->count();

        $ordenesRecientes = OrdenTrabajo::query()
            ->with(['gerencia', 'tipoFalla', 'reportadoPor', 'tecnico', 'repuestos'])
            ->where('vehiculo_id', $vehiculo->id)
            ->latest('fecha_reporte')
            ->limit(8)
            ->get();

        $registrosRecientes = HorometroRegistro::query()
            ->with(['operario', 'usuarioResponsable'])
            ->where('vehiculo_id', $vehiculo->id)
            ->latest('fecha')
            ->limit(10)
            ->get();

        $preventivo = $this->preventivoService->resumenVehiculo($vehiculo);

        return [
            'data' => [
                'vehiculo' => $vehiculo,
                'metricas' => [
                    'horometro_actual' => $ultimoRegistro?->horometro_final_confirmado
                        ?? $ultimoRegistro?->horometro_inicial_confirmado
                        ?? $vehiculo->horometro_base,
                    'horas_totales' => round($totalHoras, 2),
                    'horas_ultimos_30_dias' => round($horas30Dias, 2),
                    'registros_completos' => $registrosCompletos,
                    'registros_observados' => $registrosObservados,
                    'ordenes_totales' => $ordenesTotales,
                    'ordenes_abiertas' => $ordenesAbiertasTotal,
                    'ordenes_ultimos_30_dias' => $ordenes30Dias,
                    'repuestos_pendientes' => $repuestosPendientes,
                    'ultimo_registro_fecha' => $ultimoRegistro?->fecha?->toDateString(),
                ],
                'alertas' => $this->alertasVehiculo(
                    $vehiculo,
                    $ultimoRegistro,
                    $ordenesAbiertasTotal,
                    $registrosObservados,
                    $repuestosPendientes,
                    $preventivo,
                ),
                'mantenimiento_preventivo' => $preventivo,
                'ordenes_recientes' => $ordenesRecientes,
                'registros_recientes' => $registrosRecientes,
            ],
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $vehiculo = Vehiculo::query()->create(
            $this->vehiclePayload($request->validate($this->rules()))
        );

        return response()->json([
            'data' => $vehiculo->load(['tipoVehiculo', 'gerencia', 'sede', 'fundo', 'sector', 'lote']),
        ], 201);
    }

    public function update(Request $request, Vehiculo $vehiculo): JsonResponse
    {
        $vehiculo->update(
            $this->vehiclePayload($request->validate($this->rules($vehiculo->id)))
        );

        return response()->json([
            'data' => $vehiculo->refresh()->load(['tipoVehiculo', 'gerencia', 'sede', 'fundo', 'sector', 'lote']),
        ]);
    }

    public function importTemplate(): BinaryFileResponse
    {
        $sedes = Sede::query()
            ->where('estado', 'ACTIVO')
            ->orderBy('codigo')
            ->get()
            ->map(fn (Sede $sede) => $this->catalogLabel($sede))
            ->values()
            ->all();

        $path = SimpleXlsx::createTemplate(
            ['codigo', 'tipo_vehiculo', 'placa', 'nombre', 'marca', 'modelo', 'sede', 'horometro_base'],
            [
                ['TR-100', 'Tractor', '', 'Tractor TR-100', 'John Deere', '5075E', $sedes[0] ?? '', 0],
                ['MP-001', 'Maquinaria Pesada', '', 'Excavadora MP-001', 'CAT', '320D', $sedes[0] ?? '', 0],
            ],
            [
                'tipo_vehiculo' => ['Tractor', 'Maquinaria Pesada'],
                'sede' => $sedes,
            ],
            [
                'tipo_vehiculo' => 'tipo_vehiculo',
                'sede' => 'sede',
            ],
            'Vehiculos',
        );

        return response()
            ->download($path, 'importador_vehiculos.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend();
    }

    public function bulkImport(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'rows' => ['required', 'array', 'min:1', 'max:1000'],
            'rows.*.codigo' => ['required', 'string', 'max:40'],
            'rows.*.tipo_vehiculo' => ['required', 'string', 'max:120'],
            'rows.*.placa' => ['nullable', 'string', 'max:20'],
            'rows.*.nombre' => ['nullable', 'string', 'max:160'],
            'rows.*.marca' => ['nullable', 'string', 'max:120'],
            'rows.*.modelo' => ['nullable', 'string', 'max:120'],
            'rows.*.sede' => ['required', 'string', 'max:180'],
            'rows.*.horometro_base' => ['nullable', 'numeric', 'min:0'],
        ]);

        $summary = DB::transaction(function () use ($payload) {
            $summary = [
                'tipos_creados' => 0,
                'tipos_actualizados' => 0,
                'vehiculos_creados' => 0,
                'vehiculos_actualizados' => 0,
            ];
            $sedes = Sede::query()->get();

            foreach ($payload['rows'] as $row) {
                $tipoNombre = $this->normalizeVehicleType($row['tipo_vehiculo']);
                $sede = $this->resolveSede($sedes, $row['sede']);

                $tipo = TipoVehiculo::query()->updateOrCreate(
                    ['nombre' => $tipoNombre],
                    [
                        'requiere_horometro' => true,
                        'requiere_login_horometro' => $tipoNombre === 'Maquinaria Pesada',
                        'estado' => 'ACTIVO',
                    ],
                );
                $summary[$tipo->wasRecentlyCreated ? 'tipos_creados' : 'tipos_actualizados']++;

                $vehiculo = Vehiculo::query()->updateOrCreate(
                    ['codigo' => $this->cleanCode($row['codigo'])],
                    [
                        'placa' => $this->nullableText($row['placa'] ?? null),
                        'nombre' => $this->nullableText($row['nombre'] ?? null),
                        'tipo_vehiculo_id' => $tipo->id,
                        'marca' => $this->nullableText($row['marca'] ?? null),
                        'modelo' => $this->nullableText($row['modelo'] ?? null),
                        'gerencia_id' => null,
                        'sede_id' => $sede->id,
                        'fundo_id' => null,
                        'sector_id' => null,
                        'lote_id' => null,
                        'horometro_base' => $row['horometro_base'] ?? null,
                        'estado' => 'OPERATIVO',
                        'activo' => true,
                    ],
                );
                $summary[$vehiculo->wasRecentlyCreated ? 'vehiculos_creados' : 'vehiculos_actualizados']++;
            }

            return $summary;
        });

        return response()->json(['data' => $summary]);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(?int $ignoreId = null): array
    {
        return [
            'codigo' => ['required', 'string', 'max:40', Rule::unique('vehiculos', 'codigo')->ignore($ignoreId)],
            'placa' => ['nullable', 'string', 'max:20', Rule::unique('vehiculos', 'placa')->ignore($ignoreId)],
            'nombre' => ['nullable', 'string', 'max:160'],
            'tipo_vehiculo_id' => ['required', 'integer', Rule::exists('tipos_vehiculo', 'id')],
            'marca' => ['nullable', 'string', 'max:120'],
            'modelo' => ['nullable', 'string', 'max:120'],
            'gerencia_id' => ['nullable', 'integer', Rule::exists('gerencias', 'id')],
            'sede_id' => ['required', 'integer', Rule::exists('sedes', 'id')],
            'fundo_id' => ['nullable', 'integer', Rule::exists('fundos', 'id')],
            'sector_id' => ['nullable', 'integer', Rule::exists('sectores', 'id')],
            'lote_id' => ['nullable', 'integer', Rule::exists('lotes', 'id')],
            'horometro_base' => ['nullable', 'numeric', 'min:0'],
            'estado' => [
                'nullable',
                Rule::in([
                    'OPERATIVO',
                    'OPERATIVO_CON_PENDIENTE',
                    'FUERA_DE_SERVICIO',
                    'MANTENIMIENTO',
                    'INACTIVO',
                    'BAJA',
                ]),
            ],
            'activo' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function vehiclePayload(array $data): array
    {
        return [
            ...$data,
            'gerencia_id' => null,
            'sede_id' => $data['sede_id'],
            'fundo_id' => null,
            'sector_id' => null,
            'lote_id' => null,
            'estado' => $data['estado'] ?? 'OPERATIVO',
            'activo' => $data['activo'] ?? true,
        ];
    }

    private function cleanCode(string $code): string
    {
        return strtoupper(trim($code));
    }

    private function nullableText(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    /**
     * @param Collection<int, Sede> $sedes
     */
    private function resolveSede(Collection $sedes, string $value): Sede
    {
        $normalized = $this->normalizeComparable($value);

        foreach ($sedes as $sede) {
            if (
                $normalized === $this->normalizeComparable($sede->codigo)
                || $normalized === $this->normalizeComparable($sede->nombre)
                || $normalized === $this->normalizeComparable($this->catalogLabel($sede))
            ) {
                return $sede;
            }
        }

        throw ValidationException::withMessages([
            'rows' => ["No se encontró sede: {$value}."],
        ]);
    }

    private function catalogLabel(Sede $sede): string
    {
        return "{$sede->codigo} - {$sede->nombre}";
    }

    private function normalizeComparable(?string $value): string
    {
        return str($value ?? '')
            ->lower()
            ->ascii()
            ->squish()
            ->toString();
    }

    private function normalizeVehicleType(string $value): string
    {
        $normalized = str($value)
            ->replace('_', ' ')
            ->lower()
            ->squish()
            ->toString();

        return match ($normalized) {
            'tractor', 'tractores' => 'Tractor',
            'maquinaria pesada', 'maquinarias pesadas' => 'Maquinaria Pesada',
            default => throw ValidationException::withMessages([
                'rows' => ['Solo se permiten los tipos Tractor y Maquinaria Pesada.'],
            ]),
        };
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function alertasVehiculo(
        Vehiculo $vehiculo,
        ?HorometroRegistro $ultimoRegistro,
        int $ordenesAbiertas,
        int $registrosObservados,
        int $repuestosPendientes,
        array $preventivo,
    ): array {
        $alertas = [];

        if (in_array($vehiculo->estado, ['MANTENIMIENTO', 'FUERA_DE_SERVICIO'], true)) {
            $alertas[] = [
                'tipo' => 'taller',
                'nivel' => 'critico',
                'titulo' => 'Equipo no operativo',
                'detalle' => 'El estado actual requiere seguimiento desde Taller.',
            ];
        }

        if ($ordenesAbiertas > 0) {
            $alertas[] = [
                'tipo' => 'ordenes',
                'nivel' => 'advertencia',
                'titulo' => "{$ordenesAbiertas} OT abierta(s)",
                'detalle' => 'Existen trabajos pendientes o en curso para este equipo.',
            ];
        }

        if ($registrosObservados > 0) {
            $alertas[] = [
                'tipo' => 'horometros',
                'nivel' => 'advertencia',
                'titulo' => "{$registrosObservados} registro(s) por validar",
                'detalle' => 'Hay lecturas sin inicio, sin cierre, observadas o inconsistentes.',
            ];
        }

        if ($repuestosPendientes > 0) {
            $alertas[] = [
                'tipo' => 'repuestos',
                'nivel' => 'info',
                'titulo' => "{$repuestosPendientes} repuesto(s) pendiente(s)",
                'detalle' => 'Hay solicitudes solicitadas o disponibles sin cierre operativo.',
            ];
        }

        $planCritico = $preventivo['plan_critico'] ?? null;

        if (is_array($planCritico) && $planCritico['estado'] === 'VENCIDO') {
            $alertas[] = [
                'tipo' => 'preventivo',
                'nivel' => 'critico',
                'titulo' => "Preventivo alcanzado: {$planCritico['nombre']}",
                'detalle' => 'El horómetro actual llegó al punto de servicio programado.',
            ];
        } elseif (is_array($planCritico) && $planCritico['estado'] === 'PROXIMO') {
            $alertas[] = [
                'tipo' => 'preventivo',
                'nivel' => 'advertencia',
                'titulo' => "Preventivo próximo: {$planCritico['nombre']}",
                'detalle' => "Faltan {$planCritico['horas_restantes']} h para el servicio programado.",
            ];
        }

        if ($ultimoRegistro === null) {
            $alertas[] = [
                'tipo' => 'actividad',
                'nivel' => 'info',
                'titulo' => 'Sin registros de horómetro',
                'detalle' => 'El equipo todavía no tiene trazabilidad de uso registrada.',
            ];
        } elseif ($ultimoRegistro->fecha?->lt(Carbon::now()->subDays(7))) {
            $alertas[] = [
                'tipo' => 'actividad',
                'nivel' => 'info',
                'titulo' => 'Sin actividad reciente',
                'detalle' => 'No se registran lecturas durante los últimos 7 días.',
            ];
        }

        return $alertas;
    }
}
