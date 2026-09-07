<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MantenimientoPlan extends Model
{
    use HasFactory;

    protected $table = 'mantenimiento_planes';

    protected $fillable = [
        'tipo_vehiculo_id',
        'nombre',
        'intervalo_horas',
        'tolerancia_horas',
        'descripcion',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'intervalo_horas' => 'integer',
            'tolerancia_horas' => 'integer',
            'activo' => 'boolean',
        ];
    }

    public function tipoVehiculo(): BelongsTo
    {
        return $this->belongsTo(TipoVehiculo::class);
    }
}
