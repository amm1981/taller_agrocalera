<?php

namespace App\Http\Controllers\Api\Taller;

use App\Domain\Taller\Services\OrdenTrabajoService;
use App\Http\Controllers\Api\Concerns\FormatsApiPagination;
use App\Http\Controllers\Controller;
use App\Models\OrdenTrabajo;
use Illuminate\Http\Request;

class BacklogController extends Controller
{
    use FormatsApiPagination;

    public function __construct(private readonly OrdenTrabajoService $service)
    {
    }

    public function index(): array
    {
        return $this->paginated(
            OrdenTrabajo::query()
                ->with(['vehiculo', 'gerencia', 'tipoFalla', 'tecnico'])
                ->where('estado', 'FINALIZADA_CON_PENDIENTE')
                ->orderBy('fecha_pendiente')
                ->paginate($this->perPage()),
        );
    }

    public function resolver(Request $request, OrdenTrabajo $orden): array
    {
        return ['data' => $this->service->resolverBacklog($orden, $request->user())];
    }
}
