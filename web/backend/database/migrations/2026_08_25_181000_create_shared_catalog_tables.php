<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gerencias', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->string('nombre')->unique();
            $table->string('estado')->default('ACTIVO');
            $table->timestamps();
        });

        Schema::create('sedes', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->string('nombre')->unique();
            $table->string('estado')->default('ACTIVO');
            $table->timestamps();
        });

        Schema::create('fundos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sede_id')->constrained('sedes')->restrictOnDelete();
            $table->string('codigo')->unique();
            $table->string('nombre');
            $table->string('estado')->default('ACTIVO');
            $table->timestamps();
        });

        Schema::create('sectores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fundo_id')->constrained('fundos')->restrictOnDelete();
            $table->string('codigo')->unique();
            $table->string('nombre');
            $table->string('estado')->default('ACTIVO');
            $table->timestamps();
        });

        Schema::create('lotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sector_id')->constrained('sectores')->restrictOnDelete();
            $table->string('codigo')->unique();
            $table->string('nombre');
            $table->string('estado')->default('ACTIVO');
            $table->timestamps();
        });

        Schema::create('tipos_vehiculo', function (Blueprint $table) {
            $table->id();
            $table->string('nombre')->unique();
            $table->boolean('requiere_horometro')->default(false);
            $table->boolean('requiere_login_horometro')->default(false);
            $table->string('estado')->default('ACTIVO');
            $table->timestamps();
        });

        Schema::create('vehiculos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->string('placa')->nullable()->unique();
            $table->string('nombre')->nullable();
            $table->foreignId('tipo_vehiculo_id')->constrained('tipos_vehiculo')->restrictOnDelete();
            $table->string('marca')->nullable();
            $table->string('modelo')->nullable();
            $table->foreignId('gerencia_id')->nullable()->constrained('gerencias')->nullOnDelete();
            $table->foreignId('sede_id')->constrained('sedes')->restrictOnDelete();
            $table->foreignId('fundo_id')->nullable()->constrained('fundos')->nullOnDelete();
            $table->foreignId('sector_id')->nullable()->constrained('sectores')->nullOnDelete();
            $table->foreignId('lote_id')->nullable()->constrained('lotes')->nullOnDelete();
            $table->decimal('horometro_base', 12, 2)->nullable();
            $table->string('estado')->default('OPERATIVO');
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->index('estado');
        });

        Schema::create('personal', function (Blueprint $table) {
            $table->id();
            $table->string('dni')->unique();
            $table->string('nombres');
            $table->string('apellidos');
            $table->string('tipo');
            $table->foreignId('gerencia_id')->nullable()->constrained('gerencias')->nullOnDelete();
            $table->foreignId('sede_id')->nullable()->constrained('sedes')->nullOnDelete();
            $table->string('estado')->default('ACTIVO');
            $table->timestamps();
        });

        Schema::create('tipos_falla', function (Blueprint $table) {
            $table->id();
            $table->string('nombre')->unique();
            $table->string('estado')->default('ACTIVO');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tipos_falla');
        Schema::dropIfExists('personal');
        Schema::dropIfExists('vehiculos');
        Schema::dropIfExists('tipos_vehiculo');
        Schema::dropIfExists('lotes');
        Schema::dropIfExists('sectores');
        Schema::dropIfExists('fundos');
        Schema::dropIfExists('sedes');
        Schema::dropIfExists('gerencias');
    }
};
