<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class UsuarioAplicativo extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'usuarios_aplicativo';

    protected $fillable = [
        'personal_id',
        'nombre',
        'usuario',
        'password',
        'estado',
        'ultimo_login_at',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'ultimo_login_at' => 'datetime',
        ];
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class);
    }

    public function tiposVehiculo(): BelongsToMany
    {
        return $this->belongsToMany(TipoVehiculo::class, 'usuario_aplicativo_tipo_vehiculo')
            ->withTimestamps();
    }
}
