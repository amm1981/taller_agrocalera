<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehiculo extends Model
{
    use HasFactory;

    protected $fillable = [
        'codigo',
        'placa',
        'nombre',
        'tipo_vehiculo_id',
        'marca',
        'modelo',
        'punto_medida',
        'punto_medida_vigente_desde',
        'gerencia_id',
        'sede_id',
        'fundo_id',
        'sector_id',
        'lote_id',
        'horometro_base',
        'estado',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'horometro_base' => 'decimal:2',
            'punto_medida_vigente_desde' => 'date',
        ];
    }

    public function tipoVehiculo(): BelongsTo
    {
        return $this->belongsTo(TipoVehiculo::class);
    }

    public function gerencia(): BelongsTo
    {
        return $this->belongsTo(Gerencia::class);
    }

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class);
    }

    public function fundo(): BelongsTo
    {
        return $this->belongsTo(Fundo::class);
    }

    public function sector(): BelongsTo
    {
        return $this->belongsTo(Sector::class);
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class);
    }

    public function puntosMedida(): HasMany
    {
        return $this->hasMany(VehiculoPuntoMedida::class);
    }
}
