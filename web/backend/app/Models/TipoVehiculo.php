<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TipoVehiculo extends Model
{
    use HasFactory;

    protected $table = 'tipos_vehiculo';

    protected $fillable = [
        'nombre',
        'requiere_horometro',
        'requiere_login_horometro',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'requiere_horometro' => 'boolean',
            'requiere_login_horometro' => 'boolean',
        ];
    }
}
