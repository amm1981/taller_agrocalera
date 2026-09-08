<?php

namespace Database\Seeders;

use App\Models\HorometroConfiguracion;
use App\Models\TipoVehiculo;
use Illuminate\Database\Seeder;

class HorometroConfiguracionSeeder extends Seeder
{
    public function run(): void
    {
        HorometroConfiguracion::query()->firstOrCreate(['tipo_vehiculo_id' => null], [
            'hora_inicio_desde' => '07:00:00',
            'hora_inicio_hasta' => '08:00:00',
            'hora_cierre_hasta' => '19:30:00',
            'ocr_activo' => true,
        ]);

        TipoVehiculo::query()
            ->where('estado', 'ACTIVO')
            ->get()
            ->each(function (TipoVehiculo $tipoVehiculo) {
                HorometroConfiguracion::query()->firstOrCreate(
                    ['tipo_vehiculo_id' => $tipoVehiculo->id],
                    [
                        'hora_inicio_desde' => '07:00:00',
                        'hora_inicio_hasta' => '08:00:00',
                        'hora_cierre_hasta' => '19:30:00',
                        'tolerancia_inicio_horas' => 0,
                        'tolerancia_maxima_horas_dia' => 24,
                        'permite_correccion_manual' => true,
                        'foto_obligatoria' => true,
                        'vigencia_reapertura_minutos' => 120,
                        'ocr_activo' => false,
                        'campos_requeridos' => [
                            'sede' => true,
                            'operario' => true,
                            'foto' => $this->defaultPhotoRequired($tipoVehiculo->nombre),
                        ],
                        'parametros_adicionales' => [
                            'personal_tipos' => $this->defaultPersonalTypes($tipoVehiculo->nombre),
                        ],
                    ],
                );
            });
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

    private function defaultPhotoRequired(string $tipoVehiculo): bool
    {
        $label = strtolower($tipoVehiculo);

        return ! (str_contains($label, 'maquinaria') || str_contains($label, 'pesada'));
    }
}
