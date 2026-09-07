<?php

namespace App\Http\Controllers\Api\Taller;

use App\Http\Controllers\Controller;
use App\Models\OrdenTrabajo;
use App\Models\SolicitudRepuesto;

class DashboardController extends Controller
{
    public function __invoke(): array
    {
        return [
            'data' => [
                'ordenes' => [
                    'pendientes' => OrdenTrabajo::where('estado', 'PENDIENTE')->count(),
                    'en_curso' => OrdenTrabajo::where('estado', 'EN_CURSO')->count(),
                    'esperando_repuesto' => OrdenTrabajo::where('estado', 'ESPERANDO_REPUESTO')->count(),
                    'backlog' => OrdenTrabajo::where('estado', 'FINALIZADA_CON_PENDIENTE')->count(),
                    'finalizadas' => OrdenTrabajo::where('estado', 'FINALIZADA')->count(),
                ],
                'repuestos' => [
                    'solicitados' => SolicitudRepuesto::where('estado', 'SOLICITADO')->count(),
                    'disponibles' => SolicitudRepuesto::where('estado', 'DISPONIBLE')->count(),
                    'entregados' => SolicitudRepuesto::where('estado', 'ENTREGADO')->count(),
                ],
            ],
        ];
    }
}
