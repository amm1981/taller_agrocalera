<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ordenes_trabajo', function (Blueprint $table) {
            $table->id();
            $table->string('numero_ot')->nullable()->unique();
            $table->foreignId('vehiculo_id')->constrained('vehiculos')->restrictOnDelete();
            $table->foreignId('gerencia_id')->constrained('gerencias')->restrictOnDelete();
            $table->foreignId('tipo_falla_id')->constrained('tipos_falla')->restrictOnDelete();
            $table->text('detalle_reporte');
            $table->foreignId('reportado_por_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->foreignId('tecnico_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->string('tipo_atencion')->nullable();
            $table->text('diagnostico')->nullable();
            $table->text('trabajo_realizado')->nullable();
            $table->text('trabajo_pendiente')->nullable();
            $table->string('estado')->default('PENDIENTE');
            $table->string('estado_equipo')->default('FUERA_DE_SERVICIO');
            $table->timestamp('fecha_reporte');
            $table->timestamp('fecha_inicio_atencion')->nullable();
            $table->timestamp('fecha_finalizacion')->nullable();
            $table->timestamp('fecha_pendiente')->nullable();
            $table->timestamp('fecha_resolucion')->nullable();
            $table->timestamps();

            $table->index('numero_ot');
            $table->index('vehiculo_id');
            $table->index('estado');
            $table->index('fecha_reporte');
        });

        Schema::create('orden_trabajo_eventos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('orden_trabajo_id')->constrained('ordenes_trabajo')->cascadeOnDelete();
            $table->foreignId('usuario_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('evento');
            $table->string('estado_anterior')->nullable();
            $table->string('estado_nuevo')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('solicitudes_repuesto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('orden_trabajo_id')->constrained('ordenes_trabajo')->cascadeOnDelete();
            $table->foreignId('tecnico_id')->constrained('personal')->restrictOnDelete();
            $table->text('descripcion_solicitada');
            $table->string('codigo_sap')->nullable();
            $table->string('descripcion_sap')->nullable();
            $table->decimal('cantidad', 12, 2)->default(1);
            $table->string('estado')->default('SOLICITADO');
            $table->timestamp('fecha_solicitud');
            $table->timestamp('fecha_disponible')->nullable();
            $table->timestamp('fecha_entrega')->nullable();
            $table->text('observacion')->nullable();
            $table->timestamps();

            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitudes_repuesto');
        Schema::dropIfExists('orden_trabajo_eventos');
        Schema::dropIfExists('ordenes_trabajo');
    }
};
