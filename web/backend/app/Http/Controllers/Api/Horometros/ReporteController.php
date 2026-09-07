<?php

namespace App\Http\Controllers\Api\Horometros;

use App\Http\Controllers\Controller;
use App\Models\HorometroRegistro;
use Illuminate\Http\Request;

class ReporteController extends Controller
{
    public function __invoke(Request $request): array
    {
        $query = HorometroRegistro::query()
            ->with(['vehiculo:id,codigo,nombre,sede_id', 'vehiculo.sede:id,codigo,nombre', 'fundo:id,codigo,nombre', 'sector:id,codigo,nombre', 'lote:id,codigo,nombre'])
            ->whereNotNull('horas_trabajadas')
            ->when($request->integer('fundo_id'), fn ($q, int $fundoId) => $q->where('fundo_id', $fundoId))
            ->when($request->integer('sector_id'), fn ($q, int $sectorId) => $q->where('sector_id', $sectorId))
            ->when($request->integer('lote_id'), fn ($q, int $loteId) => $q->where('lote_id', $loteId))
            ->when($request->filled('fecha_desde'), fn ($q) => $q->whereDate('fecha', '>=', $request->input('fecha_desde')))
            ->when($request->filled('fecha_hasta'), fn ($q) => $q->whereDate('fecha', '<=', $request->input('fecha_hasta')));

        $registros = $query->get();

        return [
            'data' => [
                'horas_totales' => round((float) $registros->sum('horas_trabajadas'), 2),
                'registros_completos' => $registros->count(),
                'por_vehiculo' => $registros
                    ->groupBy('vehiculo_id')
                    ->map(fn ($items) => [
                        'vehiculo' => $items->first()->vehiculo,
                        'horas' => round((float) $items->sum('horas_trabajadas'), 2),
                    ])
                    ->values(),
            ],
        ];
    }
}
