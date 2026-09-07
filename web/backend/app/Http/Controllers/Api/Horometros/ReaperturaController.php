<?php

namespace App\Http\Controllers\Api\Horometros;

use App\Domain\Horometros\Services\HorometroService;
use App\Http\Controllers\Controller;
use App\Models\HorometroConfiguracion;
use App\Models\HorometroReapertura;
use App\Models\HorometroRegistro;
use App\Models\Vehiculo;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ReaperturaController extends Controller
{
    public function __construct(private readonly HorometroService $service)
    {
    }

    public function index(Request $request): array
    {
        $fecha = CarbonImmutable::parse($request->input('fecha', now()->toDateString()))->toDateString();

        $vehiculosQuery = Vehiculo::query()
            ->with(['tipoVehiculo', 'sede'])
            ->where('activo', true)
            ->when($request->integer('vehiculo_id'), fn (Builder $q, int $vehiculoId) => $q->where('id', $vehiculoId))
            ->when($request->integer('tipo_vehiculo_id'), fn (Builder $q, int $tipoId) => $q->where('tipo_vehiculo_id', $tipoId))
            ->when($request->integer('sede_id'), fn (Builder $q, int $sedeId) => $q->where('sede_id', $sedeId));

        $vehiculoIds = (clone $vehiculosQuery)->pluck('id');

        $registrosQuery = HorometroRegistro::query()
            ->with(['vehiculo.tipoVehiculo', 'vehiculo.sede', 'operario', 'usuarioResponsable', 'fundo', 'sector', 'lote'])
            ->whereDate('fecha', $fecha)
            ->when($vehiculoIds->isNotEmpty(), fn (Builder $q) => $q->whereIn('vehiculo_id', $vehiculoIds))
            ->when($vehiculoIds->isEmpty(), fn (Builder $q) => $q->whereRaw('1 = 0'));

        $conRegistro = (clone $registrosQuery)
            ->orderBy('estado')
            ->orderBy('vehiculo_id')
            ->get();

        $sinRegistro = (clone $vehiculosQuery)
            ->whereNotIn('id', $conRegistro->pluck('vehiculo_id'))
            ->orderBy('codigo')
            ->get();

        $reaperturas = HorometroReapertura::query()
            ->with(['vehiculo.tipoVehiculo', 'vehiculo.sede', 'usuario'])
            ->whereDate('fecha', $fecha)
            ->when($vehiculoIds->isNotEmpty(), fn (Builder $q) => $q->whereIn('vehiculo_id', $vehiculoIds))
            ->when($vehiculoIds->isEmpty(), fn (Builder $q) => $q->whereRaw('1 = 0'))
            ->latest('fecha_hora')
            ->limit(100)
            ->get();

        return [
            'data' => [
                'fecha' => $fecha,
                'con_registro' => $conRegistro,
                'sin_registro' => $sinRegistro,
                'reaperturas' => $reaperturas,
            ],
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fecha' => ['required', 'date'],
            'vehiculo_ids' => ['required', 'array', 'min:1'],
            'vehiculo_ids.*' => ['integer', Rule::exists('vehiculos', 'id')],
            'tipo_registro' => ['required', Rule::in(['INICIO', 'CIERRE'])],
            'motivo' => ['required', 'string', 'min:8', 'max:500'],
            'vigencia_minutos' => ['nullable', 'integer', 'min:15', 'max:1440'],
        ]);

        $vigencia = (int) ($data['vigencia_minutos'] ?? $this->configuracion()->vigencia_reapertura_minutos);
        $vigenteHasta = CarbonImmutable::now()->addMinutes($vigencia);
        $fecha = CarbonImmutable::parse($data['fecha'])->toDateString();

        $creadas = DB::transaction(function () use ($data, $fecha, $vigenteHasta) {
            return collect($data['vehiculo_ids'])
                ->unique()
                ->map(function (int $vehiculoId) use ($data, $fecha, $vigenteHasta) {
                    $registro = HorometroRegistro::query()
                        ->where('vehiculo_id', $vehiculoId)
                        ->whereDate('fecha', $fecha)
                        ->first();

                    if ($registro) {
                        return $this->service->reabrir(
                            $registro,
                            $data['tipo_registro'],
                            request()->user(),
                            $data['motivo'],
                            $vigenteHasta,
                        );
                    }

                    return $this->service->crearReaperturaManual(
                        $vehiculoId,
                        $fecha,
                        $data['tipo_registro'],
                        request()->user(),
                        $data['motivo'],
                        $vigenteHasta,
                    );
                })
                ->values();
        });

        return response()->json([
            'data' => [
                'creadas' => $creadas->count(),
                'reaperturas' => $creadas,
            ],
        ], 201);
    }

    private function configuracion(): HorometroConfiguracion
    {
        return HorometroConfiguracion::query()->first()
            ?? HorometroConfiguracion::query()->create([]);
    }
}
