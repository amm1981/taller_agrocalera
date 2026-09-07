<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HorometroReapertura extends Model
{
    use HasFactory;

    protected $table = 'horometro_reaperturas';

    protected $fillable = [
        'vehiculo_id',
        'fecha',
        'tipo_registro',
        'usuario_id',
        'fecha_hora',
        'estado_anterior',
        'estado_posterior',
        'motivo',
        'vigente_hasta',
        'consumida_at',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date',
            'fecha_hora' => 'datetime',
            'vigente_hasta' => 'datetime',
            'consumida_at' => 'datetime',
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
