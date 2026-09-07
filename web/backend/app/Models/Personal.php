<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class Personal extends Model
{
    use HasFactory;

    protected $table = 'personal';

    protected $fillable = [
        'dni',
        'nombres',
        'apellidos',
        'tipo',
        'gerencia_id',
        'sede_id',
        'estado',
    ];

    public function gerencia(): BelongsTo
    {
        return $this->belongsTo(Gerencia::class);
    }

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class);
    }
}
