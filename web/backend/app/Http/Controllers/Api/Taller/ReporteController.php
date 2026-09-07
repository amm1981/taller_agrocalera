<?php

namespace App\Http\Controllers\Api\Taller;

use App\Http\Controllers\Controller;
use App\Models\OrdenTrabajo;

class ReporteController extends Controller
{
    public function tiempos(): array
    {
        $ordenes = OrdenTrabajo::query()
            ->whereNotNull('fecha_finalizacion')
            ->get(['fecha_reporte', 'fecha_inicio_atencion', 'fecha_finalizacion']);

        return [
            'data' => [
                'tiempo_promedio_respuesta_minutos' => $this->averageMinutes($ordenes, 'fecha_reporte', 'fecha_inicio_atencion'),
                'tiempo_promedio_atencion_minutos' => $this->averageMinutes($ordenes, 'fecha_inicio_atencion', 'fecha_finalizacion'),
                'tiempo_promedio_requerimiento_minutos' => $this->averageMinutes($ordenes, 'fecha_reporte', 'fecha_finalizacion'),
                'mttr_minutos' => $this->averageMinutes($ordenes, 'fecha_reporte', 'fecha_finalizacion'),
            ],
        ];
    }

    public function equipos(): array
    {
        $data = OrdenTrabajo::query()
            ->with('vehiculo:id,codigo,nombre')
            ->get()
            ->groupBy('vehiculo_id')
            ->map(fn ($ordenes) => [
                'vehiculo' => $ordenes->first()->vehiculo,
                'total_ordenes' => $ordenes->count(),
                'pendientes' => $ordenes->where('estado', 'PENDIENTE')->count(),
                'finalizadas' => $ordenes->whereIn('estado', ['FINALIZADA', 'FINALIZADA_CON_PENDIENTE'])->count(),
            ])
            ->values();

        return ['data' => $data];
    }

    public function tecnicos(): array
    {
        $data = OrdenTrabajo::query()
            ->with('tecnico:id,dni,nombres,apellidos')
            ->whereNotNull('tecnico_id')
            ->get()
            ->groupBy('tecnico_id')
            ->map(fn ($ordenes) => [
                'tecnico' => $ordenes->first()->tecnico,
                'total_ordenes' => $ordenes->count(),
                'en_curso' => $ordenes->where('estado', 'EN_CURSO')->count(),
                'finalizadas' => $ordenes->whereIn('estado', ['FINALIZADA', 'FINALIZADA_CON_PENDIENTE'])->count(),
            ])
            ->values();

        return ['data' => $data];
    }

    public function backlog(): array
    {
        $data = OrdenTrabajo::query()
            ->with(['vehiculo:id,codigo,nombre', 'gerencia:id,codigo,nombre', 'tipoFalla:id,nombre', 'tecnico:id,dni,nombres,apellidos'])
            ->where('estado', 'FINALIZADA_CON_PENDIENTE')
            ->orderBy('fecha_pendiente')
            ->get()
            ->map(fn (OrdenTrabajo $orden) => [
                'orden' => $orden,
                'antiguedad_dias' => $orden->fecha_pendiente?->diffInDays(now()) ?? 0,
            ]);

        return ['data' => $data];
    }

    private function averageMinutes($ordenes, string $from, string $to): ?float
    {
        $durations = $ordenes
            ->filter(fn (OrdenTrabajo $orden) => $orden->{$from} && $orden->{$to})
            ->map(fn (OrdenTrabajo $orden) => $orden->{$from}->diffInMinutes($orden->{$to}));

        if ($durations->isEmpty()) {
            return null;
        }

        return round($durations->average(), 2);
    }
}
