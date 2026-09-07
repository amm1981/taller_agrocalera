<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $records = DB::table('horometro_registros')
            ->where('estado', 'OBSERVADO')
            ->where('horometro_inicial_confirmado', 0)
            ->where('horometro_final_confirmado', '>', 0)
            ->where('observacion', 'Las horas trabajadas superan la tolerancia maxima configurada.')
            ->get(['id', 'vehiculo_id', 'horometro_final_confirmado']);

        foreach ($records as $record) {
            DB::table('horometro_registros')
                ->where('id', $record->id)
                ->update([
                    'horas_trabajadas' => 0,
                    'estado' => 'COMPLETO',
                    'observacion' => null,
                    'updated_at' => now(),
                ]);

            DB::table('vehiculos')
                ->where('id', $record->vehiculo_id)
                ->where(function ($query) {
                    $query->whereNull('horometro_base')
                        ->orWhere('horometro_base', '<=', 0);
                })
                ->update([
                    'horometro_base' => $record->horometro_final_confirmado,
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        //
    }
};
