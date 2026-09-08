<?php

namespace App\Domain\Horometros\Services;

use App\Models\HorometroRegistro;
use App\Support\SimpleXlsx;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class HorometroSapReportService
{
    /**
     * @return array<int, string>
     */
    public function headers(): array
    {
        return [
            'Equipo ComP.',
            'Equipo Superior',
            'Centro Planificacion',
            'Punto de Medida',
            'UM Entrada de Documento',
            'Fecha de Medición',
            'Hora de Medición',
            'Valor Contador',
            'texto Medicion',
        ];
    }

    public function query(Request $request): Builder
    {
        $query = HorometroRegistro::query()
            ->with(['vehiculo.tipoVehiculo', 'vehiculo.sede', 'operario', 'usuarioResponsable', 'fundo.sede', 'sector', 'lote'])
            ->when($request->integer('vehiculo_id'), fn (Builder $q, int $vehiculoId) => $q->where('vehiculo_id', $vehiculoId))
            ->when($request->integer('operario_id'), fn (Builder $q, int $operarioId) => $q->where('operario_id', $operarioId))
            ->when($request->integer('usuario_responsable_id'), fn (Builder $q, int $usuarioId) => $q->where('usuario_responsable_id', $usuarioId))
            ->when($request->integer('fundo_id'), fn (Builder $q, int $fundoId) => $q->where('fundo_id', $fundoId))
            ->when($request->integer('sector_id'), fn (Builder $q, int $sectorId) => $q->where('sector_id', $sectorId))
            ->when($request->integer('lote_id'), fn (Builder $q, int $loteId) => $q->where('lote_id', $loteId))
            ->when($request->integer('semana_iso'), fn (Builder $q, int $week) => $q->where('semana_iso', $week))
            ->when($request->integer('semana_anio'), fn (Builder $q, int $year) => $q->where('semana_anio', $year))
            ->when($request->string('estado')->toString(), fn (Builder $q, string $estado) => $q->where('estado', $estado))
            ->when($request->integer('tipo_vehiculo_id'), function (Builder $q, int $tipoId) {
                $q->whereHas('vehiculo', fn (Builder $vehiculo) => $vehiculo->where('tipo_vehiculo_id', $tipoId));
            })
            ->when($request->filled('correccion_manual'), function (Builder $q) use ($request) {
                $value = filter_var($request->input('correccion_manual'), FILTER_VALIDATE_BOOLEAN);
                $q->where(function (Builder $subquery) use ($value) {
                    $subquery->where('correccion_manual_inicio', $value)
                        ->orWhere('correccion_manual_final', $value);
                });
            })
            ->when($request->filled('con_foto'), function (Builder $q) use ($request) {
                $value = filter_var($request->input('con_foto'), FILTER_VALIDATE_BOOLEAN);
                if ($value) {
                    $q->where(function (Builder $subquery) {
                        $subquery->whereNotNull('foto_inicial')
                            ->orWhereNotNull('foto_final');
                    });
                } else {
                    $q->whereNull('foto_inicial')->whereNull('foto_final');
                }
            })
            ->when($request->filled('fecha'), fn (Builder $q) => $q->whereDate('fecha', $request->input('fecha')))
            ->when($request->filled('fecha_desde'), fn (Builder $q) => $q->whereDate('fecha', '>=', $request->input('fecha_desde')))
            ->when($request->filled('fecha_hasta'), fn (Builder $q) => $q->whereDate('fecha', '<=', $request->input('fecha_hasta')));

        $query->when($request->integer('sede_id'), function (Builder $q, int $sedeId) {
            $q->where(function (Builder $query) use ($sedeId) {
                $query->whereHas('fundo', fn (Builder $fundo) => $fundo->where('sede_id', $sedeId))
                    ->orWhereHas('vehiculo', fn (Builder $vehiculo) => $vehiculo->where('sede_id', $sedeId));
            });
        });

        return $query;
    }

    /**
     * @return array<int, array<string, string|float|null>>
     */
    public function associativeRows(Request $request): array
    {
        return $this->records($request)
            ->flatMap(fn (HorometroRegistro $registro) => $this->measurementRows($registro))
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<int, string|float|null>>
     */
    public function spreadsheetRows(Request $request): array
    {
        return array_map(
            fn (array $row): array => array_values($row),
            $this->associativeRows($request),
        );
    }

    public function createSpreadsheet(Request $request): string
    {
        return SimpleXlsx::createTemplate(
            $this->headers(),
            $this->spreadsheetRows($request),
            sheetName: 'Exportable SAP',
        );
    }

    private function records(Request $request)
    {
        return $this->query($request)
            ->orderBy('fecha')
            ->orderBy('vehiculo_id')
            ->orderBy('id')
            ->get();
    }

    /**
     * @return array<int, array<string, string|float|null>>
     */
    private function measurementRows(HorometroRegistro $registro): array
    {
        $rows = [];

        if ($registro->horometro_inicial_confirmado !== null) {
            $rows[] = $this->rowForMeasurement(
                $registro,
                $registro->fecha_hora_inicio,
                (float) $registro->horometro_inicial_confirmado,
            );
        }

        if ($registro->horometro_final_confirmado !== null) {
            $rows[] = $this->rowForMeasurement(
                $registro,
                $registro->fecha_hora_final,
                (float) $registro->horometro_final_confirmado,
            );
        }

        return $rows;
    }

    /**
     * @return array<string, string|float|null>
     */
    private function rowForMeasurement(HorometroRegistro $registro, CarbonInterface|string|null $timestamp, float $value): array
    {
        $fecha = $timestamp
            ? ($timestamp instanceof CarbonInterface ? CarbonImmutable::instance($timestamp) : CarbonImmutable::parse($timestamp))
            : CarbonImmutable::parse($registro->fecha);
        $sedeCodigo = $registro->fundo?->sede?->codigo ?? $registro->vehiculo?->sede?->codigo;
        $placa = $registro->vehiculo?->placa ?? '';
        $semana = $fecha->isoWeek();
        $fechaTexto = $fecha->format('j').$fecha->format('n').$fecha->format('Y');

        return [
            'Equipo ComP.' => $registro->vehiculo?->codigo,
            'Equipo Superior' => null,
            'Centro Planificacion' => $sedeCodigo,
            'Punto de Medida' => $registro->punto_medida ?? $registro->vehiculo?->punto_medida,
            'UM Entrada de Documento' => 'H',
            'Fecha de Medición' => $fecha->format('d/m/Y'),
            'Hora de Medición' => $timestamp ? $fecha->format('H:i:s') : null,
            'Valor Contador' => $value,
            'texto Medicion' => trim("{$placa} SEM {$semana} {$sedeCodigo} {$fechaTexto}"),
        ];
    }
}
