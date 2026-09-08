<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuarios_aplicativo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('personal_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->string('nombre');
            $table->string('usuario')->unique();
            $table->string('password');
            $table->string('estado')->default('ACTIVO');
            $table->timestamp('ultimo_login_at')->nullable();
            $table->timestamps();

            $table->index('estado');
        });

        Schema::create('usuario_aplicativo_tipo_vehiculo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_aplicativo_id')->constrained('usuarios_aplicativo')->cascadeOnDelete();
            $table->foreignId('tipo_vehiculo_id')->constrained('tipos_vehiculo')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['usuario_aplicativo_id', 'tipo_vehiculo_id'], 'uatv_unique');
        });

        Schema::table('horometro_registros', function (Blueprint $table) {
            if (! Schema::hasColumn('horometro_registros', 'usuario_aplicativo_id')) {
                $table->foreignId('usuario_aplicativo_id')->nullable()->after('usuario_responsable_id')->constrained('usuarios_aplicativo')->nullOnDelete();
            }
        });

        Schema::table('horometro_configuracion', function (Blueprint $table) {
            if (! Schema::hasColumn('horometro_configuracion', 'tipo_vehiculo_id')) {
                $table->foreignId('tipo_vehiculo_id')->nullable()->after('id')->constrained('tipos_vehiculo')->cascadeOnDelete();
            }

            if (! Schema::hasColumn('horometro_configuracion', 'campos_requeridos')) {
                $table->json('campos_requeridos')->nullable()->after('ocr_activo');
            }

            if (! Schema::hasColumn('horometro_configuracion', 'parametros_adicionales')) {
                $table->json('parametros_adicionales')->nullable()->after('campos_requeridos');
            }
        });

        $globalConfig = DB::table('horometro_configuracion')->whereNull('tipo_vehiculo_id')->first();
        $tipos = DB::table('tipos_vehiculo')->where('estado', 'ACTIVO')->get(['id', 'nombre']);

        foreach ($tipos as $tipo) {
            $exists = DB::table('horometro_configuracion')->where('tipo_vehiculo_id', $tipo->id)->exists();

            if ($exists) {
                continue;
            }

            DB::table('horometro_configuracion')->insert([
                'tipo_vehiculo_id' => $tipo->id,
                'hora_inicio_desde' => $globalConfig->hora_inicio_desde ?? '07:00:00',
                'hora_inicio_hasta' => $globalConfig->hora_inicio_hasta ?? '08:00:00',
                'hora_cierre_hasta' => $globalConfig->hora_cierre_hasta ?? '19:30:00',
                'tolerancia_inicio_horas' => $globalConfig->tolerancia_inicio_horas ?? 0,
                'tolerancia_maxima_horas_dia' => $globalConfig->tolerancia_maxima_horas_dia ?? 24,
                'permite_correccion_manual' => $globalConfig->permite_correccion_manual ?? true,
                'foto_obligatoria' => $globalConfig->foto_obligatoria ?? true,
                'vigencia_reapertura_minutos' => $globalConfig->vigencia_reapertura_minutos ?? 120,
                'ocr_activo' => false,
                'campos_requeridos' => json_encode([
                    'sede' => true,
                    'operario' => ! str_contains(strtolower($tipo->nombre), 'tractor'),
                    'foto' => ! str_contains(strtolower($tipo->nombre), 'maquinaria pesada'),
                ]),
                'parametros_adicionales' => json_encode([
                    'personal_tipos' => $this->defaultPersonalTypes($tipo->nombre),
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('horometro_configuracion', function (Blueprint $table) {
            if (Schema::hasColumn('horometro_configuracion', 'parametros_adicionales')) {
                $table->dropColumn('parametros_adicionales');
            }

            if (Schema::hasColumn('horometro_configuracion', 'campos_requeridos')) {
                $table->dropColumn('campos_requeridos');
            }

            if (Schema::hasColumn('horometro_configuracion', 'tipo_vehiculo_id')) {
                $table->dropConstrainedForeignId('tipo_vehiculo_id');
            }
        });

        Schema::table('horometro_registros', function (Blueprint $table) {
            if (Schema::hasColumn('horometro_registros', 'usuario_aplicativo_id')) {
                $table->dropConstrainedForeignId('usuario_aplicativo_id');
            }
        });

        Schema::dropIfExists('usuario_aplicativo_tipo_vehiculo');
        Schema::dropIfExists('usuarios_aplicativo');
    }

    /**
     * @return array<int, string>
     */
    private function defaultPersonalTypes(string $tipoVehiculo): array
    {
        $label = strtolower($tipoVehiculo);

        if (str_contains($label, 'maquinaria') || str_contains($label, 'pesada')) {
            return ['MAQUINISTA'];
        }

        if (str_contains($label, 'tractor')) {
            return ['TRACTORISTA', 'OPERARIO', 'CONDUCTOR'];
        }

        return [];
    }
};
