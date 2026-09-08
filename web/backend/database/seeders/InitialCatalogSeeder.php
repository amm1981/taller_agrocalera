<?php

namespace Database\Seeders;

use App\Models\Gerencia;
use App\Models\MantenimientoPlan;
use App\Models\Sede;
use App\Models\TipoFalla;
use App\Models\TipoPersonal;
use App\Models\TipoVehiculo;
use App\Models\Vehiculo;
use Illuminate\Database\Seeder;

class InitialCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $gerencias = [
            ['codigo' => 'CIT', 'nombre' => 'Cítricos'],
            ['codigo' => 'PAL', 'nombre' => 'Palto'],
            ['codigo' => 'GEN', 'nombre' => 'General'],
            ['codigo' => 'ADM', 'nombre' => 'Administrativa'],
            ['codigo' => 'GHU', 'nombre' => 'Gestión Humana'],
        ];

        foreach ($gerencias as $gerencia) {
            Gerencia::updateOrCreate(
                ['codigo' => $gerencia['codigo']],
                $gerencia + ['estado' => 'ACTIVO'],
            );
        }

        $sede = Sede::updateOrCreate(
            ['codigo' => 'LOCAL'],
            ['nombre' => 'Sede local', 'estado' => 'ACTIVO'],
        );

        $tiposVehiculo = [
            ['nombre' => 'Tractor', 'requiere_horometro' => true, 'requiere_login_horometro' => false],
            ['nombre' => 'Maquinaria Pesada', 'requiere_horometro' => true, 'requiere_login_horometro' => true],
        ];

        foreach ($tiposVehiculo as $tipoVehiculo) {
            TipoVehiculo::updateOrCreate(
                ['nombre' => $tipoVehiculo['nombre']],
                $tipoVehiculo + ['estado' => 'ACTIVO'],
            );
        }

        TipoVehiculo::query()
            ->whereNotIn('nombre', collect($tiposVehiculo)->pluck('nombre')->all())
            ->update(['estado' => 'INACTIVO']);

        foreach (['Motor', 'Transmisión', 'Eléctrico', 'Hidráulico', 'Neumático', 'Otro'] as $tipoFalla) {
            TipoFalla::updateOrCreate(
                ['nombre' => $tipoFalla],
                ['estado' => 'ACTIVO'],
            );
        }

        foreach ([
            ['codigo' => 'OPERARIO', 'nombre' => 'Operario'],
            ['codigo' => 'RESPONSABLE', 'nombre' => 'Responsable'],
            ['codigo' => 'TECNICO', 'nombre' => 'Tecnico'],
            ['codigo' => 'CONDUCTOR', 'nombre' => 'Conductor'],
            ['codigo' => 'MAQUINISTA', 'nombre' => 'Maquinista'],
            ['codigo' => 'OTRO', 'nombre' => 'Otro'],
        ] as $tipoPersonal) {
            TipoPersonal::updateOrCreate(
                ['codigo' => $tipoPersonal['codigo']],
                $tipoPersonal + ['estado' => 'ACTIVO'],
            );
        }

        $tractor = TipoVehiculo::where('nombre', 'Tractor')->firstOrFail();
        $maquinariaPesada = TipoVehiculo::where('nombre', 'Maquinaria Pesada')->firstOrFail();

        $vehiculos = [
            ['codigo' => 'TR-015', 'tipo_vehiculo_id' => $tractor->id, 'nombre' => 'Tractor TR-015'],
            ['codigo' => 'TR-008', 'tipo_vehiculo_id' => $tractor->id, 'nombre' => 'Tractor TR-008'],
            ['codigo' => 'MP-001', 'tipo_vehiculo_id' => $maquinariaPesada->id, 'nombre' => 'Excavadora MP-001'],
            ['codigo' => 'MP-002', 'tipo_vehiculo_id' => $maquinariaPesada->id, 'nombre' => 'Cargador frontal MP-002'],
            ['codigo' => 'MP-003', 'tipo_vehiculo_id' => $maquinariaPesada->id, 'nombre' => 'Retroexcavadora MP-003'],
        ];

        foreach ($vehiculos as $vehiculo) {
            Vehiculo::updateOrCreate(
                ['codigo' => $vehiculo['codigo']],
                $vehiculo + [
                    'gerencia_id' => null,
                    'sede_id' => $sede->id,
                    'estado' => 'OPERATIVO',
                    'activo' => true,
                ],
            );
        }

        $planesPreventivos = [
            'Tractor' => [
                ['nombre' => 'Servicio 250 h', 'intervalo_horas' => 250, 'tolerancia_horas' => 25, 'descripcion' => 'Cambio de filtros, engrase general y revisión operativa.'],
                ['nombre' => 'Servicio 500 h', 'intervalo_horas' => 500, 'tolerancia_horas' => 40, 'descripcion' => 'Mantenimiento ampliado de motor, transmisión y sistema hidráulico.'],
            ],
            'Maquinaria Pesada' => [
                ['nombre' => 'Servicio 250 h', 'intervalo_horas' => 250, 'tolerancia_horas' => 25, 'descripcion' => 'Mantenimiento preventivo de carga, hidráulico y lubricación.'],
            ],
        ];

        foreach ($planesPreventivos as $tipoNombre => $planes) {
            $tipo = TipoVehiculo::where('nombre', $tipoNombre)->first();

            if (! $tipo) {
                continue;
            }

            foreach ($planes as $plan) {
                MantenimientoPlan::updateOrCreate(
                    ['tipo_vehiculo_id' => $tipo->id, 'nombre' => $plan['nombre']],
                    $plan + ['activo' => true],
                );
            }
        }
    }
}
