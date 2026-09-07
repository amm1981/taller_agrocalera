<?php

namespace App\Http\Controllers\Api\Taller;

use App\Domain\Mantenimiento\Services\PreventivoService;
use App\Http\Controllers\Controller;
use App\Models\Vehiculo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class PreventivoController extends Controller
{
    public function __construct(private readonly PreventivoService $service)
    {
    }

    public function index(Request $request): array
    {
        $vehiculos = Vehiculo::query()
            ->with(['tipoVehiculo', 'gerencia', 'sede', 'fundo', 'sector', 'lote'])
            ->where('activo', true)
            ->whereHas('tipoVehiculo', fn (Builder $query) => $query->where('requiere_horometro', true))
            ->when($request->integer('tipo_vehiculo_id'), fn (Builder $query, int $value) => $query->where('tipo_vehiculo_id', $value))
            ->when($request->integer('sede_id'), fn (Builder $query, int $value) => $query->where('sede_id', $value))
            ->when($request->string('estado')->toString(), fn (Builder $query, string $value) => $query->where('estado', $value))
            ->orderBy('codigo')
            ->get()
            ->map(function (Vehiculo $vehiculo) {
                $preventivo = $this->service->resumenVehiculo($vehiculo);

                return [
                    'vehiculo' => $vehiculo,
                    'preventivo' => $preventivo,
                ];
            })
            ->sortByDesc(fn (array $row) => match ($row['preventivo']['estado']) {
                'VENCIDO' => 4,
                'PROXIMO' => 3,
                'SIN_HOROMETRO' => 2,
                'SIN_PLAN' => 1,
                default => 0,
            })
            ->values();

        return [
            'data' => $vehiculos,
            'resumen' => [
                'total' => $vehiculos->count(),
                'vencidos' => $vehiculos->where('preventivo.estado', 'VENCIDO')->count(),
                'proximos' => $vehiculos->where('preventivo.estado', 'PROXIMO')->count(),
                'sin_horometro' => $vehiculos->where('preventivo.estado', 'SIN_HOROMETRO')->count(),
                'al_dia' => $vehiculos->where('preventivo.estado', 'AL_DIA')->count(),
            ],
        ];
    }
}
