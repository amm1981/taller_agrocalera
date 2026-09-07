<?php

namespace App\Domain\Mantenimiento\Services;

use App\Models\HorometroRegistro;
use App\Models\MantenimientoPlan;
use App\Models\Vehiculo;

class PreventivoService
{
    /**
     * @return array<string, mixed>
     */
    public function resumenVehiculo(Vehiculo $vehiculo): array
    {
        $horometroActual = $this->horometroActual($vehiculo);
        $planes = MantenimientoPlan::query()
            ->where('tipo_vehiculo_id', $vehiculo->tipo_vehiculo_id)
            ->where('activo', true)
            ->orderBy('intervalo_horas')
            ->get()
            ->map(fn (MantenimientoPlan $plan) => $this->calcularPlan($plan, $horometroActual))
            ->values()
            ->all();

        $planCritico = $this->planCritico($planes);

        return [
            'estado' => $planCritico['estado'] ?? ($horometroActual === null ? 'SIN_HOROMETRO' : 'SIN_PLAN'),
            'horometro_actual' => $horometroActual,
            'plan_critico' => $planCritico,
            'planes' => $planes,
        ];
    }

    private function horometroActual(Vehiculo $vehiculo): ?float
    {
        $ultimoRegistro = HorometroRegistro::query()
            ->where('vehiculo_id', $vehiculo->id)
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->first();

        $valor = $ultimoRegistro?->horometro_final_confirmado
            ?? $ultimoRegistro?->horometro_inicial_confirmado
            ?? $vehiculo->horometro_base;

        return $valor === null ? null : (float) $valor;
    }

    /**
     * @return array<string, mixed>
     */
    private function calcularPlan(MantenimientoPlan $plan, ?float $horometroActual): array
    {
        if ($horometroActual === null) {
            return [
                'id' => $plan->id,
                'nombre' => $plan->nombre,
                'intervalo_horas' => $plan->intervalo_horas,
                'tolerancia_horas' => $plan->tolerancia_horas,
                'descripcion' => $plan->descripcion,
                'estado' => 'SIN_HOROMETRO',
                'proximo_servicio_horas' => null,
                'horas_restantes' => null,
                'porcentaje_ciclo' => 0,
            ];
        }

        $intervalo = max(1, $plan->intervalo_horas);
        $residuo = fmod($horometroActual, $intervalo);
        $enPuntoServicio = $horometroActual > 0 && abs($residuo) < 0.0001;
        $proximoServicio = $enPuntoServicio
            ? $horometroActual
            : (floor($horometroActual / $intervalo) + 1) * $intervalo;
        $horasRestantes = max(0, $proximoServicio - $horometroActual);
        $porcentajeCiclo = $enPuntoServicio
            ? 100
            : min(100, round(($residuo / $intervalo) * 100, 1));

        $estado = 'AL_DIA';

        if ($horasRestantes === 0.0) {
            $estado = 'VENCIDO';
        } elseif ($horasRestantes <= $plan->tolerancia_horas) {
            $estado = 'PROXIMO';
        }

        return [
            'id' => $plan->id,
            'nombre' => $plan->nombre,
            'intervalo_horas' => $plan->intervalo_horas,
            'tolerancia_horas' => $plan->tolerancia_horas,
            'descripcion' => $plan->descripcion,
            'estado' => $estado,
            'proximo_servicio_horas' => round($proximoServicio, 2),
            'horas_restantes' => round($horasRestantes, 2),
            'porcentaje_ciclo' => $porcentajeCiclo,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $planes
     * @return array<string, mixed>|null
     */
    private function planCritico(array $planes): ?array
    {
        $prioridad = [
            'VENCIDO' => 4,
            'PROXIMO' => 3,
            'SIN_HOROMETRO' => 2,
            'AL_DIA' => 1,
        ];

        usort($planes, function (array $a, array $b) use ($prioridad) {
            $prioridadA = $prioridad[$a['estado']] ?? 0;
            $prioridadB = $prioridad[$b['estado']] ?? 0;

            if ($prioridadA === $prioridadB) {
                return ($a['horas_restantes'] ?? PHP_INT_MAX) <=> ($b['horas_restantes'] ?? PHP_INT_MAX);
            }

            return $prioridadB <=> $prioridadA;
        });

        return $planes[0] ?? null;
    }
}
