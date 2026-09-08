<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TipoPersonal extends Model
{
    use HasFactory;

    protected $table = 'tipos_personal';

    protected $fillable = ['codigo', 'nombre', 'estado'];

    public function setCodigoAttribute(string $value): void
    {
        $this->attributes['codigo'] = strtoupper(str($value)->squish()->replace(' ', '_')->toString());
    }
}
