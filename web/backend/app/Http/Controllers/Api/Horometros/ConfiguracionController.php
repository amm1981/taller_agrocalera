<?php

namespace App\Http\Controllers\Api\Horometros;

use App\Http\Controllers\Controller;
use App\Models\HorometroConfiguracion;
use Illuminate\Http\Request;

class ConfiguracionController extends Controller
{
    public function show(): array
    {
        return ['data' => $this->configuracion()];
    }

    public function update(Request $request): array
    {
        $data = $request->validate([
            'hora_inicio_desde' => ['required', 'date_format:H:i'],
            'hora_inicio_hasta' => ['required', 'date_format:H:i'],
            'hora_cierre_hasta' => ['required', 'date_format:H:i'],
            'tolerancia_inicio_horas' => ['required', 'numeric', 'min:0', 'max:999'],
            'tolerancia_maxima_horas_dia' => ['required', 'numeric', 'min:0', 'max:999'],
            'permite_correccion_manual' => ['required', 'boolean'],
            'foto_obligatoria' => ['required', 'boolean'],
            'vigencia_reapertura_minutos' => ['required', 'integer', 'min:15', 'max:1440'],
            'ocr_activo' => ['required', 'boolean'],
        ]);

        $data['hora_inicio_desde'] = "{$data['hora_inicio_desde']}:00";
        $data['hora_inicio_hasta'] = "{$data['hora_inicio_hasta']}:00";
        $data['hora_cierre_hasta'] = "{$data['hora_cierre_hasta']}:00";

        $configuracion = $this->configuracion();
        $configuracion->update($data);

        return ['data' => $configuracion->refresh()];
    }

    private function configuracion(): HorometroConfiguracion
    {
        return HorometroConfiguracion::query()->first()
            ?? HorometroConfiguracion::query()->create([]);
    }
}
