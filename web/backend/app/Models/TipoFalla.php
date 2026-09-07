<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TipoFalla extends Model
{
    use HasFactory;

    protected $table = 'tipos_falla';

    protected $fillable = ['nombre', 'estado'];
}
