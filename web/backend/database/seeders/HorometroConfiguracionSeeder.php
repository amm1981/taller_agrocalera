<?php

namespace Database\Seeders;

use App\Models\HorometroConfiguracion;
use Illuminate\Database\Seeder;

class HorometroConfiguracionSeeder extends Seeder
{
    public function run(): void
    {
        HorometroConfiguracion::query()->firstOrCreate([], [
            'hora_inicio_desde' => '07:00:00',
            'hora_inicio_hasta' => '08:00:00',
            'hora_cierre_hasta' => '19:30:00',
            'ocr_activo' => true,
        ]);
    }
}
