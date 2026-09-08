<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('tipos_personal')->updateOrInsert(
            ['codigo' => 'MAQUINISTA'],
            [
                'nombre' => 'Maquinista',
                'estado' => 'ACTIVO',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
    }

    public function down(): void
    {
        DB::table('tipos_personal')->where('codigo', 'MAQUINISTA')->delete();
    }
};
