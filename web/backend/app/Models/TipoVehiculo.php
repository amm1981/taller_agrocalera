<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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

    public function configuracionesHorometro(): HasMany
    {
        return $this->hasMany(HorometroConfiguracion::class);
    }

    public function configuracionHorometro(): HasOne
    {
        return $this->hasOne(HorometroConfiguracion::class);
    }

    protected function casts(): array
    {
        return [
            'requiere_horometro' => 'boolean',
            'requiere_login_horometro' => 'boolean',
        ];
    }
}
