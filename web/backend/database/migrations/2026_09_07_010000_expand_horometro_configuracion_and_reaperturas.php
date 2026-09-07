<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('horometro_reaperturas', 'motivo')) {
            Schema::table('horometro_reaperturas', function (Blueprint $table) {
                $table->text('motivo')->nullable()->after('estado_posterior');
            });
        }

        if (! Schema::hasColumn('horometro_reaperturas', 'vigente_hasta')) {
            Schema::table('horometro_reaperturas', function (Blueprint $table) {
                $table->timestamp('vigente_hasta')->nullable()->after('motivo');
            });
        }

        $columns = [
            'tolerancia_inicio_horas' => fn (Blueprint $table) => $table->decimal('tolerancia_inicio_horas', 8, 2)->default(0)->after('hora_cierre_hasta'),
            'tolerancia_maxima_horas_dia' => fn (Blueprint $table) => $table->decimal('tolerancia_maxima_horas_dia', 8, 2)->default(24)->after('tolerancia_inicio_horas'),
            'permite_correccion_manual' => fn (Blueprint $table) => $table->boolean('permite_correccion_manual')->default(true)->after('tolerancia_maxima_horas_dia'),
            'foto_obligatoria' => fn (Blueprint $table) => $table->boolean('foto_obligatoria')->default(true)->after('permite_correccion_manual'),
            'vigencia_reapertura_minutos' => fn (Blueprint $table) => $table->unsignedSmallInteger('vigencia_reapertura_minutos')->default(120)->after('foto_obligatoria'),
        ];

        foreach ($columns as $column => $definition) {
            if (! Schema::hasColumn('horometro_configuracion', $column)) {
                Schema::table('horometro_configuracion', $definition);
            }
        }
    }

    public function down(): void
    {
        $configColumns = [
            'tolerancia_inicio_horas',
            'tolerancia_maxima_horas_dia',
            'permite_correccion_manual',
            'foto_obligatoria',
            'vigencia_reapertura_minutos',
        ];

        foreach ($configColumns as $column) {
            if (Schema::hasColumn('horometro_configuracion', $column)) {
                Schema::table('horometro_configuracion', fn (Blueprint $table) => $table->dropColumn($column));
            }
        }

        foreach (['motivo', 'vigente_hasta'] as $column) {
            if (Schema::hasColumn('horometro_reaperturas', $column)) {
                Schema::table('horometro_reaperturas', fn (Blueprint $table) => $table->dropColumn($column));
            }
        }
    }
};
