<?php

namespace App\Http\Controllers\Api\Horometros;

use App\Http\Controllers\Controller;
use App\Models\HorometroRegistro;
use App\Models\Vehiculo;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request): array
    {
        $desde = CarbonImmutable::parse($request->input('fecha_desde', $request->input('fecha', now()->toDateString())))->startOfDay();
        $hasta = CarbonImmutable::parse($request->input('fecha_hasta', $request->input('fecha', $desde->toDateString())))->startOfDay();
        $dias = iterator_count(CarbonPeriod::create($desde, $hasta));

        $vehiculosQuery = Vehiculo::query()
            ->with(['tipoVehiculo', 'sede'])
            ->where('activo', true)
            ->when($request->integer('vehiculo_id'), fn (Builder $q, int $vehiculoId) => $q->where('id', $vehiculoId))
            ->when($request->integer('tipo_vehiculo_id'), fn (Builder $q, int $tipoId) => $q->where('tipo_vehiculo_id', $tipoId))
            ->when($request->integer('sede_id'), fn (Builder $q, int $sedeId) => $q->where('sede_id', $sedeId));

        $vehiculoIds = (clone $vehiculosQuery)->pluck('id');
        $vehiculosEsperados = $vehiculoIds->count() * max($dias, 1);

        $registrosQuery = HorometroRegistro::query()
            ->with(['vehiculo.tipoVehiculo', 'vehiculo.sede', 'operario', 'usuarioResponsable', 'fundo', 'sector', 'lote'])
            ->whereDate('fecha', '>=', $desde->toDateString())
            ->whereDate('fecha', '<=', $hasta->toDateString())
            ->when($vehiculoIds->isNotEmpty(), fn (Builder $q) => $q->whereIn('vehiculo_id', $vehiculoIds))
            ->when($vehiculoIds->isEmpty(), fn (Builder $q) => $q->whereRaw('1 = 0'))
            ->when($request->integer('fundo_id'), fn (Builder $q, int $fundoId) => $q->where('fundo_id', $fundoId))
            ->when($request->integer('sector_id'), fn (Builder $q, int $sectorId) => $q->where('sector_id', $sectorId))
            ->when($request->integer('lote_id'), fn (Builder $q, int $loteId) => $q->where('lote_id', $loteId));

        $registrados = (clone $registrosQuery)->count();
        $iniciosRegistrados = (clone $registrosQuery)->whereNotNull('fecha_hora_inicio')->count();
        $cierresRegistrados = (clone $registrosQuery)->whereNotNull('fecha_hora_final')->count();
        $pendientesCierre = (clone $registrosQuery)->whereIn('estado', ['EN_JORNADA', 'SIN_CIERRE', 'INCONSISTENCIA'])->count();
        $inconsistencias = (clone $registrosQuery)->where('estado', 'INCONSISTENCIA')->count();
        $observados = (clone $registrosQuery)->where('estado', 'OBSERVADO')->count();
        $correccionesManuales = (clone $registrosQuery)
            ->where(function (Builder $q) {
                $q->where('correccion_manual_inicio', true)
                    ->orWhere('correccion_manual_final', true);
            })
            ->count();

        $vehiculosConRegistro = (clone $registrosQuery)->distinct('vehiculo_id')->pluck('vehiculo_id');
        $totalVehiculosSinRegistro = max($vehiculosEsperados - $registrados, 0);
        $vehiculosSinRegistro = (clone $vehiculosQuery)
            ->whereNotIn('id', $vehiculosConRegistro)
            ->orderBy('codigo')
            ->limit(20)
            ->get();

        $topVehiculos = (clone $registrosQuery)
            ->whereNotNull('horas_trabajadas')
            ->selectRaw('vehiculo_id, SUM(horas_trabajadas) as horas')
            ->groupBy('vehiculo_id')
            ->orderByDesc('horas')
            ->limit(5)
            ->get()
            ->load('vehiculo.tipoVehiculo');

        $alertas = collect([
            $pendientesCierre > 0 ? ['tipo' => 'pendientes_cierre', 'mensaje' => "{$pendientesCierre} vehiculos pendientes de cierre."] : null,
            $inconsistencias > 0 ? ['tipo' => 'inconsistencias', 'mensaje' => "{$inconsistencias} registros con diferencia frente al cierre anterior."] : null,
            $observados > 0 ? ['tipo' => 'observados', 'mensaje' => "{$observados} registros observados para revision."] : null,
            $totalVehiculosSinRegistro > 0 ? ['tipo' => 'sin_registro', 'mensaje' => "{$totalVehiculosSinRegistro} vehiculos activos sin registro en el rango."] : null,
        ])->filter()->values();

        return [
            'data' => [
                'fecha' => $desde->toDateString(),
                'fecha_desde' => $desde->toDateString(),
                'fecha_hasta' => $hasta->toDateString(),
                'inicios_esperados' => $vehiculosEsperados,
                'inicios_registrados' => $iniciosRegistrados,
                'cierres_esperados' => $iniciosRegistrados,
                'cierres_registrados' => $cierresRegistrados,
                'pendientes_cierre' => $pendientesCierre,
                'completos' => (clone $registrosQuery)->where('estado', 'COMPLETO')->count(),
                'inconsistencias' => $inconsistencias,
                'observados' => $observados + $inconsistencias,
                'correcciones_manuales' => $correccionesManuales,
                'vehiculos_sin_registro' => $totalVehiculosSinRegistro,
                'vehiculos_jornada_completa' => (clone $registrosQuery)->where('estado', 'COMPLETO')->distinct('vehiculo_id')->count('vehiculo_id'),
                'top_vehiculos_horas' => $topVehiculos,
                'alertas' => $alertas,
                'sin_registro_muestra' => $vehiculosSinRegistro,
            ],
        ];
    }
}
