<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class HorometroRegistro extends Model
{
    use HasFactory;

    protected $table = 'horometro_registros';

    protected $appends = [
        'foto_inicial_url',
        'foto_final_url',
    ];

    protected $fillable = [
        'vehiculo_id',
        'fecha',
        'operario_id',
        'usuario_responsable_id',
        'fundo_id',
        'sector_id',
        'lote_id',
        'horometro_inicial_ocr',
        'horometro_inicial_confirmado',
        'foto_inicial',
        'fecha_hora_inicio',
        'correccion_manual_inicio',
        'horometro_final_ocr',
        'horometro_final_confirmado',
        'foto_final',
        'fecha_hora_final',
        'correccion_manual_final',
        'horas_trabajadas',
        'estado',
        'observacion',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date',
            'fecha_hora_inicio' => 'datetime',
            'fecha_hora_final' => 'datetime',
            'correccion_manual_inicio' => 'boolean',
            'correccion_manual_final' => 'boolean',
            'horometro_inicial_ocr' => 'decimal:2',
            'horometro_inicial_confirmado' => 'decimal:2',
            'horometro_final_ocr' => 'decimal:2',
            'horometro_final_confirmado' => 'decimal:2',
            'horas_trabajadas' => 'decimal:2',
        ];
    }

    public function vehiculo(): BelongsTo
    {
        return $this->belongsTo(Vehiculo::class);
    }

    public function operario(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'operario_id');
    }

    public function usuarioResponsable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_responsable_id');
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

    public function getFotoInicialUrlAttribute(): ?string
    {
        return $this->evidenceUrl($this->foto_inicial);
    }

    public function getFotoFinalUrlAttribute(): ?string
    {
        return $this->evidenceUrl($this->foto_final);
    }

    private function evidenceUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        try {
            return Storage::disk(config('filesystems.evidence_disk', 'public'))->url($path);
        } catch (\Throwable) {
            return null;
        }
    }
}
