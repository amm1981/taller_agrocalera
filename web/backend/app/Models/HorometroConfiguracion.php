<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HorometroConfiguracion extends Model
{
    use HasFactory;

    protected $table = 'horometro_configuracion';

    protected $fillable = [
        'tipo_vehiculo_id',
        'hora_inicio_desde',
        'hora_inicio_hasta',
        'hora_cierre_hasta',
        'tolerancia_inicio_horas',
        'tolerancia_maxima_horas_dia',
        'permite_correccion_manual',
        'foto_obligatoria',
        'vigencia_reapertura_minutos',
        'ocr_activo',
        'campos_requeridos',
        'parametros_adicionales',
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
            'campos_requeridos' => 'array',
            'parametros_adicionales' => 'array',
        ];
    }

    public function tipoVehiculo(): BelongsTo
    {
        return $this->belongsTo(TipoVehiculo::class);
    }
}
