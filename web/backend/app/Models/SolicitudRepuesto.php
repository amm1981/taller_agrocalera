<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolicitudRepuesto extends Model
{
    use HasFactory;

    protected $table = 'solicitudes_repuesto';

    protected $fillable = [
        'orden_trabajo_id',
        'tecnico_id',
        'descripcion_solicitada',
        'codigo_sap',
        'descripcion_sap',
        'cantidad',
        'estado',
        'fecha_solicitud',
        'fecha_disponible',
        'fecha_entrega',
        'observacion',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:2',
            'fecha_solicitud' => 'datetime',
            'fecha_disponible' => 'datetime',
            'fecha_entrega' => 'datetime',
        ];
    }

    public function ordenTrabajo(): BelongsTo
    {
        return $this->belongsTo(OrdenTrabajo::class);
    }

    public function tecnico(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'tecnico_id');
    }
}
