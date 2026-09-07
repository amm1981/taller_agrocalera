<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrdenTrabajo extends Model
{
    use HasFactory;

    protected $table = 'ordenes_trabajo';

    protected $fillable = [
        'numero_ot',
        'vehiculo_id',
        'gerencia_id',
        'tipo_falla_id',
        'detalle_reporte',
        'reportado_por_id',
        'tecnico_id',
        'tipo_atencion',
        'diagnostico',
        'trabajo_realizado',
        'trabajo_pendiente',
        'estado',
        'estado_equipo',
        'fecha_reporte',
        'fecha_inicio_atencion',
        'fecha_finalizacion',
        'fecha_pendiente',
        'fecha_resolucion',
    ];

    protected function casts(): array
    {
        return [
            'fecha_reporte' => 'datetime',
            'fecha_inicio_atencion' => 'datetime',
            'fecha_finalizacion' => 'datetime',
            'fecha_pendiente' => 'datetime',
            'fecha_resolucion' => 'datetime',
        ];
    }

    public function vehiculo(): BelongsTo
    {
        return $this->belongsTo(Vehiculo::class);
    }

    public function gerencia(): BelongsTo
    {
        return $this->belongsTo(Gerencia::class);
    }

    public function tipoFalla(): BelongsTo
    {
        return $this->belongsTo(TipoFalla::class);
    }

    public function reportadoPor(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'reportado_por_id');
    }

    public function tecnico(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'tecnico_id');
    }

    public function eventos(): HasMany
    {
        return $this->hasMany(OrdenTrabajoEvento::class);
    }

    public function repuestos(): HasMany
    {
        return $this->hasMany(SolicitudRepuesto::class);
    }
}
