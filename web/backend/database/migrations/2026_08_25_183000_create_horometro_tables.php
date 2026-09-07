<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('horometro_registros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehiculo_id')->constrained('vehiculos')->restrictOnDelete();
            $table->date('fecha');
            $table->foreignId('operario_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->foreignId('usuario_responsable_id')->nullable()->constrained('users')->nullOnDelete();

            $table->decimal('horometro_inicial_ocr', 12, 2)->nullable();
            $table->decimal('horometro_inicial_confirmado', 12, 2)->nullable();
            $table->string('foto_inicial')->nullable();
            $table->timestamp('fecha_hora_inicio')->nullable();
            $table->boolean('correccion_manual_inicio')->default(false);

            $table->decimal('horometro_final_ocr', 12, 2)->nullable();
            $table->decimal('horometro_final_confirmado', 12, 2)->nullable();
            $table->string('foto_final')->nullable();
            $table->timestamp('fecha_hora_final')->nullable();
            $table->boolean('correccion_manual_final')->default(false);

            $table->decimal('horas_trabajadas', 12, 2)->nullable();
            $table->string('estado')->default('PENDIENTE_INICIO');
            $table->text('observacion')->nullable();
            $table->timestamps();

            $table->unique(['vehiculo_id', 'fecha']);
            $table->index('vehiculo_id');
            $table->index('fecha');
            $table->index('estado');
        });

        Schema::create('horometro_reaperturas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehiculo_id')->constrained('vehiculos')->restrictOnDelete();
            $table->date('fecha');
            $table->string('tipo_registro');
            $table->foreignId('usuario_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('fecha_hora');
            $table->string('estado_anterior')->nullable();
            $table->string('estado_posterior');
            $table->text('motivo')->nullable();
            $table->timestamp('vigente_hasta')->nullable();
            $table->timestamp('consumida_at')->nullable();
            $table->timestamps();

            $table->index(['vehiculo_id', 'fecha', 'tipo_registro']);
        });

        Schema::create('horometro_configuracion', function (Blueprint $table) {
            $table->id();
            $table->time('hora_inicio_desde')->default('07:00:00');
            $table->time('hora_inicio_hasta')->default('08:00:00');
            $table->time('hora_cierre_hasta')->default('19:30:00');
            $table->decimal('tolerancia_inicio_horas', 8, 2)->default(0);
            $table->decimal('tolerancia_maxima_horas_dia', 8, 2)->default(24);
            $table->boolean('permite_correccion_manual')->default(true);
            $table->boolean('foto_obligatoria')->default(true);
            $table->unsignedSmallInteger('vigencia_reapertura_minutos')->default(120);
            $table->boolean('ocr_activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('horometro_configuracion');
        Schema::dropIfExists('horometro_reaperturas');
        Schema::dropIfExists('horometro_registros');
    }
};
