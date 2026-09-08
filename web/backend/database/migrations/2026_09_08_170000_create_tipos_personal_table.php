<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tipos_personal', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->string('nombre')->unique();
            $table->string('estado')->default('ACTIVO');
            $table->timestamps();
        });

        $now = now();

        DB::table('tipos_personal')->insert([
            ['codigo' => 'OPERARIO', 'nombre' => 'Operario', 'estado' => 'ACTIVO', 'created_at' => $now, 'updated_at' => $now],
            ['codigo' => 'RESPONSABLE', 'nombre' => 'Responsable', 'estado' => 'ACTIVO', 'created_at' => $now, 'updated_at' => $now],
            ['codigo' => 'TECNICO', 'nombre' => 'Tecnico', 'estado' => 'ACTIVO', 'created_at' => $now, 'updated_at' => $now],
            ['codigo' => 'CONDUCTOR', 'nombre' => 'Conductor', 'estado' => 'ACTIVO', 'created_at' => $now, 'updated_at' => $now],
            ['codigo' => 'OTRO', 'nombre' => 'Otro', 'estado' => 'ACTIVO', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('tipos_personal');
    }
};
