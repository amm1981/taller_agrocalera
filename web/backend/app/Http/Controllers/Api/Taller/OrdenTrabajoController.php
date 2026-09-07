<?php

namespace App\Http\Controllers\Api\Taller;

use App\Domain\Taller\Services\OrdenTrabajoService;
use App\Http\Controllers\Api\Concerns\FormatsApiPagination;
use App\Http\Controllers\Controller;
use App\Models\OrdenTrabajo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrdenTrabajoController extends Controller
{
    use FormatsApiPagination;

    public function __construct(private readonly OrdenTrabajoService $service)
    {
    }

    public function index(Request $request): array
    {
        $query = OrdenTrabajo::query()
            ->with(['vehiculo', 'gerencia', 'tipoFalla', 'reportadoPor', 'tecnico'])
            ->when($request->string('q')->toString(), function (Builder $q, string $search) {
                $q->where(function (Builder $nested) use ($search) {
                    $nested
                        ->where('numero_ot', 'like', "%{$search}%")
                        ->orWhere('detalle_reporte', 'like', "%{$search}%");
                });
            });

        foreach (['vehiculo_id', 'gerencia_id', 'tipo_falla_id', 'tecnico_id'] as $filter) {
            $query->when($request->integer($filter), fn (Builder $q, int $value) => $q->where($filter, $value));
        }

        $query
            ->when($request->string('estado')->toString(), fn (Builder $q, string $estado) => $q->where('estado', $estado))
            ->when($request->filled('fecha_desde'), fn (Builder $q) => $q->whereDate('fecha_reporte', '>=', $request->input('fecha_desde')))
            ->when($request->filled('fecha_hasta'), fn (Builder $q) => $q->whereDate('fecha_reporte', '<=', $request->input('fecha_hasta')));

        return $this->paginated($query->latest('fecha_reporte')->paginate($this->perPage()));
    }

    public function store(Request $request): JsonResponse
    {
        $orden = $this->service->crear($request->validate($this->storeRules()), $request->user());

        return response()->json(['data' => $orden], 201);
    }

    public function show(OrdenTrabajo $orden): array
    {
        return [
            'data' => $orden->load([
                'vehiculo',
                'gerencia',
                'tipoFalla',
                'reportadoPor',
                'tecnico',
                'repuestos.tecnico',
                'eventos.usuario',
            ]),
        ];
    }

    public function tomar(Request $request, OrdenTrabajo $orden): array
    {
        return [
            'data' => $this->service->tomar($orden, $request->validate([
                'tecnico_id' => ['required', 'integer', Rule::exists('personal', 'id')],
                'tipo_atencion' => ['required', Rule::in(['AUXILIO', 'TALLER'])],
            ]), $request->user()),
        ];
    }

    public function iniciar(Request $request, OrdenTrabajo $orden): array
    {
        return ['data' => $this->service->iniciar($orden, $request->user())];
    }

    public function guardarAvance(Request $request, OrdenTrabajo $orden): array
    {
        return [
            'data' => $this->service->guardarAvance($orden, $request->validate([
                'diagnostico' => ['nullable', 'string'],
                'trabajo_realizado' => ['nullable', 'string'],
                'trabajo_pendiente' => ['nullable', 'string'],
            ]), $request->user()),
        ];
    }

    public function finalizar(Request $request, OrdenTrabajo $orden): array
    {
        return [
            'data' => $this->service->finalizar($orden, $request->validate([
                'diagnostico' => ['nullable', 'string'],
                'trabajo_realizado' => ['required', 'string'],
                'trabajo_pendiente' => ['nullable', 'string'],
                'estado_equipo' => [
                    'required',
                    Rule::in(['OPERATIVO', 'OPERATIVO_CON_PENDIENTE', 'FUERA_DE_SERVICIO']),
                ],
            ]), $request->user()),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function storeRules(): array
    {
        return [
            'vehiculo_id' => ['required', 'integer', Rule::exists('vehiculos', 'id')],
            'gerencia_id' => ['required', 'integer', Rule::exists('gerencias', 'id')],
            'tipo_falla_id' => ['required', 'integer', Rule::exists('tipos_falla', 'id')],
            'detalle_reporte' => ['required', 'string'],
            'reportado_por_id' => ['nullable', 'integer', Rule::exists('personal', 'id')],
            'estado_equipo' => [
                'nullable',
                Rule::in(['OPERATIVO', 'OPERATIVO_CON_PENDIENTE', 'FUERA_DE_SERVICIO', 'MANTENIMIENTO']),
            ],
            'fecha_reporte' => ['nullable', 'date'],
        ];
    }
}
