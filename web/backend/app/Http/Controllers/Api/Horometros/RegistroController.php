<?php

namespace App\Http\Controllers\Api\Horometros;

use App\Domain\Horometros\Services\HorometroService;
use App\Http\Controllers\Api\Concerns\FormatsApiPagination;
use App\Http\Controllers\Controller;
use App\Models\HorometroConfiguracion;
use App\Models\HorometroRegistro;
use App\Models\Lote;
use App\Models\Sector;
use App\Support\SimpleXlsx;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class RegistroController extends Controller
{
    use FormatsApiPagination;

    public function __construct(private readonly HorometroService $service) {}

    public function index(Request $request): array
    {
        $query = $this->baseQuery($request);

        return $this->paginated($query->latest('fecha')->paginate($this->perPage()));
    }

    public function export(Request $request): BinaryFileResponse
    {
        $headers = [
            'ID',
            'Fecha',
            'Vehículo',
            'Placa',
            'Tipo vehículo',
            'Sede',
            'Fundo',
            'Sector',
            'Lote',
            'Operario',
            'DNI operario',
            'Responsable',
            'Horómetro inicial',
            'Horómetro final',
            'Horas trabajadas',
            'Estado',
            'Inicio',
            'Cierre',
            'Corrección manual',
            'Foto inicial',
            'Foto final',
            'Observación',
        ];

        $rows = $this->baseQuery($request)
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->get()
            ->map(fn (HorometroRegistro $registro): array => [
                $registro->id,
                $registro->fecha?->format('d/m/Y'),
                $registro->vehiculo ? "{$registro->vehiculo->codigo} - {$registro->vehiculo->nombre}" : null,
                $registro->vehiculo?->placa,
                $registro->vehiculo?->tipoVehiculo?->nombre,
                $registro->fundo?->sede?->nombre ?? $registro->vehiculo?->sede?->nombre,
                $registro->fundo?->nombre,
                $registro->sector?->nombre,
                $registro->lote?->nombre,
                trim(($registro->operario?->nombres ?? '').' '.($registro->operario?->apellidos ?? '')) ?: null,
                $registro->operario?->dni,
                trim(($registro->usuarioResponsable?->name ?? '').' '.($registro->usuarioResponsable?->last_name ?? '')) ?: null,
                $registro->horometro_inicial_confirmado,
                $registro->horometro_final_confirmado,
                $registro->horas_trabajadas,
                str_replace('_', ' ', $registro->estado),
                $registro->fecha_hora_inicio?->format('d/m/Y H:i:s'),
                $registro->fecha_hora_final?->format('d/m/Y H:i:s'),
                ($registro->correccion_manual_inicio || $registro->correccion_manual_final) ? 'Sí' : 'No',
                $registro->foto_inicial ? 'Sí' : 'No',
                $registro->foto_final ? 'Sí' : 'No',
                $registro->observacion,
            ])
            ->all();

        $path = SimpleXlsx::createTemplate($headers, $rows, sheetName: 'Registros');
        $fileName = 'horometros-registros-'.now()->format('Ymd-His').'.xlsx';

        return response()->download(
            $path,
            $fileName,
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        )->deleteFileAfterSend(true);
    }

    public function show(HorometroRegistro $registro): array
    {
        return [
            'data' => $registro->load(['vehiculo.tipoVehiculo', 'operario', 'usuarioResponsable', 'fundo', 'sector', 'lote']),
        ];
    }

    public function inicio(Request $request): JsonResponse
    {
        $fotoRules = $this->photoRules('foto_inicial', 'foto_inicial_base64');

        $data = $request->validate([
            'vehiculo_id' => ['required', 'integer', Rule::exists('vehiculos', 'id')],
            'client_reference' => ['nullable', 'string', 'max:100'],
            'fecha' => ['nullable', 'date'],
            'operario_id' => ['nullable', 'integer', Rule::exists('personal', 'id')],
            'fundo_id' => ['nullable', 'integer', Rule::exists('fundos', 'id')],
            'sector_id' => ['nullable', 'integer', Rule::exists('sectores', 'id')],
            'lote_id' => ['nullable', 'integer', Rule::exists('lotes', 'id')],
            'horometro_inicial_ocr' => ['nullable', 'numeric', 'min:0'],
            'horometro_inicial_confirmado' => ['required', 'numeric', 'min:0'],
            'foto_inicial' => $fotoRules['path'],
            'foto_inicial_base64' => ['nullable', 'string'],
            'fecha_hora_inicio' => ['nullable', 'date'],
            'correccion_manual_inicio' => ['nullable', 'boolean'],
        ]);

        if ($path = $this->storeEvidenceImage($data['foto_inicial_base64'] ?? null, 'inicio')) {
            $data['foto_inicial'] = $path;
        }

        unset($data['foto_inicial_base64']);
        $data = $this->normalizeLocation($data);

        $registro = $this->service->registrarInicio($data, $request->user());

        return response()->json(['data' => $registro], 201);
    }

    public function cierre(Request $request, HorometroRegistro $registro): array
    {
        $fotoRules = $this->photoRules('foto_final', 'foto_final_base64');

        $data = $request->validate([
            'horometro_final_ocr' => ['nullable', 'numeric', 'min:0'],
            'horometro_final_confirmado' => ['required', 'numeric', 'min:0'],
            'foto_final' => $fotoRules['path'],
            'foto_final_base64' => ['nullable', 'string'],
            'fecha_hora_final' => ['nullable', 'date'],
            'correccion_manual_final' => ['nullable', 'boolean'],
        ]);

        if ($path = $this->storeEvidenceImage($data['foto_final_base64'] ?? null, 'cierre')) {
            $data['foto_final'] = $path;
        }

        unset($data['foto_final_base64']);

        return [
            'data' => $this->service->registrarCierre($registro, $data, $request->user()),
        ];
    }

    public function pendientes(Request $request): array
    {
        $query = $this->baseQuery($request)
            ->whereIn('estado', ['PENDIENTE_INICIO', 'EN_JORNADA', 'SIN_INICIO', 'SIN_CIERRE', 'INCONSISTENCIA', 'OBSERVADO']);

        return $this->paginated($query->orderBy('fecha')->paginate($this->perPage()));
    }

    public function validaciones(Request $request): array
    {
        $query = $this->baseQuery($request)
            ->whereIn('estado', ['SIN_INICIO', 'SIN_CIERRE', 'INCONSISTENCIA', 'REGULARIZADO', 'OBSERVADO']);

        return $this->paginated($query->orderBy('fecha')->paginate($this->perPage()));
    }

    public function reabrir(Request $request, HorometroRegistro $registro): JsonResponse
    {
        $data = $request->validate([
            'tipo_registro' => ['required', Rule::in(['INICIO', 'CIERRE'])],
            'motivo' => ['required', 'string', 'min:8', 'max:500'],
            'vigencia_minutos' => ['nullable', 'integer', 'min:15', 'max:1440'],
        ]);

        $vigencia = (int) ($data['vigencia_minutos'] ?? $this->configuracion()->vigencia_reapertura_minutos);

        return response()->json([
            'data' => $this->service->reabrir(
                $registro,
                $data['tipo_registro'],
                $request->user(),
                $data['motivo'],
                CarbonImmutable::now()->addMinutes($vigencia),
            ),
        ], 201);
    }

    public function anular(Request $request, HorometroRegistro $registro): array
    {
        return ['data' => $this->service->anular($registro, $request->user())];
    }

    private function baseQuery(Request $request): Builder
    {
        $query = HorometroRegistro::query()
            ->with(['vehiculo.tipoVehiculo', 'vehiculo.sede', 'operario', 'usuarioResponsable', 'fundo.sede', 'sector', 'lote'])
            ->when($request->integer('vehiculo_id'), fn (Builder $q, int $vehiculoId) => $q->where('vehiculo_id', $vehiculoId))
            ->when($request->integer('operario_id'), fn (Builder $q, int $operarioId) => $q->where('operario_id', $operarioId))
            ->when($request->integer('usuario_responsable_id'), fn (Builder $q, int $usuarioId) => $q->where('usuario_responsable_id', $usuarioId))
            ->when($request->integer('fundo_id'), fn (Builder $q, int $fundoId) => $q->where('fundo_id', $fundoId))
            ->when($request->integer('sector_id'), fn (Builder $q, int $sectorId) => $q->where('sector_id', $sectorId))
            ->when($request->integer('lote_id'), fn (Builder $q, int $loteId) => $q->where('lote_id', $loteId))
            ->when($request->string('estado')->toString(), fn (Builder $q, string $estado) => $q->where('estado', $estado))
            ->when($request->integer('tipo_vehiculo_id'), function (Builder $q, int $tipoId) {
                $q->whereHas('vehiculo', fn (Builder $vehiculo) => $vehiculo->where('tipo_vehiculo_id', $tipoId));
            })
            ->when($request->filled('correccion_manual'), function (Builder $q) use ($request) {
                $value = filter_var($request->input('correccion_manual'), FILTER_VALIDATE_BOOLEAN);
                $q->where(function (Builder $subquery) use ($value) {
                    $subquery->where('correccion_manual_inicio', $value)
                        ->orWhere('correccion_manual_final', $value);
                });
            })
            ->when($request->filled('con_foto'), function (Builder $q) use ($request) {
                $value = filter_var($request->input('con_foto'), FILTER_VALIDATE_BOOLEAN);
                if ($value) {
                    $q->where(function (Builder $subquery) {
                        $subquery->whereNotNull('foto_inicial')
                            ->orWhereNotNull('foto_final');
                    });
                } else {
                    $q->whereNull('foto_inicial')->whereNull('foto_final');
                }
            })
            ->when($request->filled('fecha'), fn (Builder $q) => $q->whereDate('fecha', $request->input('fecha')))
            ->when($request->filled('fecha_desde'), fn (Builder $q) => $q->whereDate('fecha', '>=', $request->input('fecha_desde')))
            ->when($request->filled('fecha_hasta'), fn (Builder $q) => $q->whereDate('fecha', '<=', $request->input('fecha_hasta')));

        $query->when($request->integer('sede_id'), function (Builder $q, int $sedeId) {
            $q->where(function (Builder $query) use ($sedeId) {
                $query->whereHas('fundo', fn (Builder $fundo) => $fundo->where('sede_id', $sedeId))
                    ->orWhereHas('vehiculo', fn (Builder $vehiculo) => $vehiculo->where('sede_id', $sedeId));
            });
        });

        return $query;
    }

    /**
     * @return array{path: array<int, mixed>}
     */
    private function photoRules(string $pathField, string $base64Field): array
    {
        $required = $this->configuracion()->foto_obligatoria ? "required_without:{$base64Field}" : 'nullable';

        return [
            'path' => [$required, 'nullable', 'string', 'max:255'],
        ];
    }

    private function configuracion(): HorometroConfiguracion
    {
        return HorometroConfiguracion::query()->first()
            ?? HorometroConfiguracion::query()->create([]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeLocation(array $data): array
    {
        if (! empty($data['lote_id'])) {
            $lote = Lote::query()
                ->with('sector')
                ->findOrFail($data['lote_id']);

            $data['sector_id'] = $lote->sector_id;
            $data['fundo_id'] = $lote->sector?->fundo_id ?? $data['fundo_id'] ?? null;

            return $data;
        }

        if (! empty($data['sector_id'])) {
            $sector = Sector::query()->findOrFail($data['sector_id']);
            $data['fundo_id'] = $sector->fundo_id;
        }

        return $data;
    }

    private function storeEvidenceImage(?string $base64, string $kind): ?string
    {
        if (! $base64) {
            return null;
        }

        $payload = Str::of($base64)->after('base64,')->toString();
        $binary = base64_decode($payload, true);

        if ($binary === false) {
            $field = $kind === 'inicio' ? 'foto_inicial_base64' : 'foto_final_base64';

            throw ValidationException::withMessages([
                $field => ['La imagen enviada no tiene un formato base64 valido.'],
            ]);
        }

        $path = sprintf(
            'horometros/%s/%s-%s.jpg',
            now()->format('Y/m/d'),
            $kind,
            (string) Str::uuid(),
        );

        Storage::disk(config('filesystems.evidence_disk', 'public'))->put($path, $binary);

        return $path;
    }
}
