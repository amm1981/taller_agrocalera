<?php

use Carbon\CarbonImmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('horometro_registros', function (Blueprint $table) {
            $table->unsignedSmallInteger('semana_iso')->nullable()->after('fecha');
            $table->unsignedSmallInteger('semana_anio')->nullable()->after('semana_iso');
            $table->index(['semana_anio', 'semana_iso']);
        });

        DB::table('horometro_registros')
            ->select(['id', 'fecha'])
            ->orderBy('id')
            ->chunkById(200, function ($registros): void {
                foreach ($registros as $registro) {
                    $fecha = CarbonImmutable::parse($registro->fecha);

                    DB::table('horometro_registros')
                        ->where('id', $registro->id)
                        ->update([
                            'semana_iso' => $fecha->isoWeek(),
                            'semana_anio' => $fecha->isoWeekYear(),
                        ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('horometro_registros', function (Blueprint $table) {
            $table->dropIndex(['semana_anio', 'semana_iso']);
            $table->dropColumn(['semana_iso', 'semana_anio']);
        });
    }
};
