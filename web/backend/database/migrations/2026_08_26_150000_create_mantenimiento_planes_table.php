<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mantenimiento_planes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tipo_vehiculo_id')->constrained('tipos_vehiculo')->restrictOnDelete();
            $table->string('nombre');
            $table->unsignedInteger('intervalo_horas');
            $table->unsignedInteger('tolerancia_horas')->default(25);
            $table->text('descripcion')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->unique(['tipo_vehiculo_id', 'nombre']);
            $table->index(['tipo_vehiculo_id', 'activo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mantenimiento_planes');
    }
};
