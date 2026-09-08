<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehiculoPuntoMedida extends Model
{
    use HasFactory;

    protected $table = 'vehiculo_puntos_medida';

    protected $fillable = [
        'vehiculo_id',
        'punto_medida',
        'vigente_desde',
        'usuario_id',
    ];

    protected function casts(): array
    {
        return [
            'vigente_desde' => 'date',
        ];
    }

    public function vehiculo(): BelongsTo
    {
        return $this->belongsTo(Vehiculo::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
