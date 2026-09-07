<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HorometroConfiguracion extends Model
{
    use HasFactory;

    protected $table = 'horometro_configuracion';

    protected $fillable = [
        'hora_inicio_desde',
        'hora_inicio_hasta',
        'hora_cierre_hasta',
        'tolerancia_inicio_horas',
        'tolerancia_maxima_horas_dia',
        'permite_correccion_manual',
        'foto_obligatoria',
        'vigencia_reapertura_minutos',
        'ocr_activo',
    ];

    protected function casts(): array
    {
        return [
            'ocr_activo' => 'boolean',
            'permite_correccion_manual' => 'boolean',
            'foto_obligatoria' => 'boolean',
            'tolerancia_inicio_horas' => 'decimal:2',
            'tolerancia_maxima_horas_dia' => 'decimal:2',
            'vigencia_reapertura_minutos' => 'integer',
        ];
    }
}
