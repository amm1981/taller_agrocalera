<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehiculo_puntos_medida', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehiculo_id')->constrained('vehiculos')->cascadeOnDelete();
            $table->string('punto_medida');
            $table->date('vigente_desde');
            $table->foreignId('usuario_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['vehiculo_id', 'vigente_desde']);
            $table->index(['vehiculo_id', 'punto_medida']);
        });

        Schema::table('horometro_registros', function (Blueprint $table) {
            $table->string('punto_medida')->nullable()->after('lote_id');
        });

        DB::table('vehiculos')
            ->whereNotNull('punto_medida')
            ->orderBy('id')
            ->get(['id', 'punto_medida', 'punto_medida_vigente_desde', 'created_at', 'updated_at'])
            ->each(function (object $vehiculo): void {
                $vigenteDesde = $vehiculo->punto_medida_vigente_desde
                    ?? ($vehiculo->created_at ? Carbon::parse($vehiculo->created_at)->toDateString() : now()->toDateString());

                DB::table('vehiculo_puntos_medida')->insert([
                    'vehiculo_id' => $vehiculo->id,
                    'punto_medida' => $vehiculo->punto_medida,
                    'vigente_desde' => $vigenteDesde,
                    'created_at' => $vehiculo->created_at ?? now(),
                    'updated_at' => $vehiculo->updated_at ?? now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::table('horometro_registros', function (Blueprint $table) {
            $table->dropColumn('punto_medida');
        });

        Schema::dropIfExists('vehiculo_puntos_medida');
    }
};
