<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class Sector extends Model
{
    use HasFactory;

    protected $table = 'sectores';

    protected $fillable = ['fundo_id', 'codigo', 'nombre', 'estado'];

    public function fundo(): BelongsTo
    {
        return $this->belongsTo(Fundo::class);
    }
}
