<?php

namespace App\Http\Controllers\Api\Taller;

use App\Domain\Taller\Services\OrdenTrabajoService;
use App\Http\Controllers\Api\Concerns\FormatsApiPagination;
use App\Http\Controllers\Controller;
use App\Models\OrdenTrabajo;
use App\Models\SolicitudRepuesto;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RepuestoController extends Controller
{
    use FormatsApiPagination;

    public function __construct(private readonly OrdenTrabajoService $service)
    {
    }

    public function index(Request $request): array
    {
        $query = SolicitudRepuesto::query()
            ->with(['ordenTrabajo.vehiculo', 'tecnico'])
            ->when($request->string('estado')->toString(), fn (Builder $q, string $estado) => $q->where('estado', $estado))
            ->when($request->integer('tecnico_id'), fn (Builder $q, int $tecnicoId) => $q->where('tecnico_id', $tecnicoId))
            ->when($request->integer('orden_trabajo_id'), fn (Builder $q, int $ordenId) => $q->where('orden_trabajo_id', $ordenId))
            ->when($request->filled('fecha_desde'), fn (Builder $q) => $q->whereDate('fecha_solicitud', '>=', $request->input('fecha_desde')))
            ->when($request->filled('fecha_hasta'), fn (Builder $q) => $q->whereDate('fecha_solicitud', '<=', $request->input('fecha_hasta')));

        return $this->paginated($query->latest('fecha_solicitud')->paginate($this->perPage()));
    }

    public function store(Request $request, OrdenTrabajo $orden): JsonResponse
    {
        $repuesto = $this->service->solicitarRepuesto($orden, $request->validate($this->rules()), $request->user());

        return response()->json(['data' => $repuesto], 201);
    }

    public function update(Request $request, SolicitudRepuesto $repuesto): array
    {
        $repuesto->update($request->validate([
            'descripcion_solicitada' => ['required', 'string'],
            'codigo_sap' => ['nullable', 'string', 'max:80'],
            'descripcion_sap' => ['nullable', 'string', 'max:180'],
            'cantidad' => ['required', 'numeric', 'min:0.01'],
            'observacion' => ['nullable', 'string'],
        ]));

        return ['data' => $repuesto->refresh()->load(['ordenTrabajo.vehiculo', 'tecnico'])];
    }

    public function marcarDisponible(Request $request, SolicitudRepuesto $repuesto): array
    {
        return ['data' => $this->service->marcarRepuestoDisponible($repuesto, $request->user())];
    }

    public function confirmarRecojo(Request $request, SolicitudRepuesto $repuesto): array
    {
        return ['data' => $this->service->confirmarRecojoRepuesto($repuesto, $request->user())];
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        return [
            'tecnico_id' => ['required', 'integer', Rule::exists('personal', 'id')],
            'descripcion_solicitada' => ['required', 'string'],
            'codigo_sap' => ['nullable', 'string', 'max:80'],
            'descripcion_sap' => ['nullable', 'string', 'max:180'],
            'cantidad' => ['required', 'numeric', 'min:0.01'],
            'observacion' => ['nullable', 'string'],
        ];
    }
}
