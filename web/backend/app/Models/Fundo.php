<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class Fundo extends Model
{
    use HasFactory;

    protected $fillable = ['sede_id', 'codigo', 'nombre', 'estado'];

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class);
    }
}
