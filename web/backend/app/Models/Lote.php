<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class Lote extends Model
{
    use HasFactory;

    protected $fillable = ['sector_id', 'codigo', 'nombre', 'estado'];

    public function sector(): BelongsTo
    {
        return $this->belongsTo(Sector::class);
    }
}
