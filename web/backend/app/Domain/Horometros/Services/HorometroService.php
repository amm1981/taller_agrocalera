<?php

namespace App\Domain\Horometros\Services;

use App\Models\HorometroConfiguracion;
use App\Models\HorometroReapertura;
use App\Models\HorometroRegistro;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class HorometroService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function registrarInicio(array $data, User $user): HorometroRegistro
    {
        return DB::transaction(function () use ($data, $user) {
            $fechaHora = $this->fechaHora($data['fecha_hora_inicio'] ?? null);
            $fecha = CarbonImmutable::parse($data['fecha'] ?? $fechaHora->toDateString())->toDateString();
            $reapertura = $this->reaperturaDisponible((int) $data['vehiculo_id'], $fecha, 'INICIO');
            $config = $this->configuracion();

            if (! $reapertura) {
                $this->validarHorarioInicio($fechaHora);
            }

            $this->validarCorreccionManual((bool) ($data['correccion_manual_inicio'] ?? false), $config, 'correccion_manual_inicio');

            $registro = HorometroRegistro::query()
                ->where('vehiculo_id', $data['vehiculo_id'])
                ->whereDate('fecha', $fecha)
                ->first()
                ?? new HorometroRegistro([
                    'vehiculo_id' => $data['vehiculo_id'],
                    'fecha' => $fecha,
                ]);

            if ($registro->exists && ! $reapertura) {
                throw ValidationException::withMessages([
                    'vehiculo_id' => ['Ya existe un registro para el vehículo y fecha indicados.'],
                ]);
            }

            $this->validarContinuidadInicio(
                (int) $data['vehiculo_id'],
                $fecha,
                (float) $data['horometro_inicial_confirmado'],
            );

            $registro->fill([
                'operario_id' => $data['operario_id'] ?? $registro->operario_id,
                'usuario_responsable_id' => $user->id,
                'fundo_id' => $data['fundo_id'] ?? $registro->fundo_id,
                'sector_id' => $data['sector_id'] ?? $registro->sector_id,
                'lote_id' => $data['lote_id'] ?? $registro->lote_id,
                'horometro_inicial_ocr' => $data['horometro_inicial_ocr'] ?? null,
                'horometro_inicial_confirmado' => $data['horometro_inicial_confirmado'],
                'foto_inicial' => $data['foto_inicial'] ?? $registro->foto_inicial,
                'fecha_hora_inicio' => $fechaHora,
                'correccion_manual_inicio' => (bool) ($data['correccion_manual_inicio'] ?? false),
                'estado' => 'EN_JORNADA',
                'observacion' => null,
            ])->save();

            $this->consumirReapertura($reapertura);

            return $this->loadRegistro($registro);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function registrarCierre(HorometroRegistro $registro, array $data, User $user): HorometroRegistro
    {
        return DB::transaction(function () use ($registro, $data, $user) {
            $fechaHora = $this->fechaHora($data['fecha_hora_final'] ?? null);
            $reapertura = $this->reaperturaDisponible($registro->vehiculo_id, $registro->fecha->toDateString(), 'CIERRE');
            $config = $this->configuracion();

            if (! $reapertura) {
                $this->validarHorarioCierre($fechaHora);
            }

            $this->validarCorreccionManual((bool) ($data['correccion_manual_final'] ?? false), $config, 'correccion_manual_final');

            if ($registro->horometro_inicial_confirmado === null) {
                throw ValidationException::withMessages([
                    'horometro_inicial_confirmado' => ['El registro no tiene horómetro inicial.'],
                ]);
            }

            if ((float) $data['horometro_final_confirmado'] < (float) $registro->horometro_inicial_confirmado) {
                throw ValidationException::withMessages([
                    'horometro_final_confirmado' => [
                        sprintf(
                            'El horómetro final no puede ser menor al horómetro inicial. Horómetro inicial válido: %s. Valor ingresado: %s.',
                            $this->formatHorometro((float) $registro->horometro_inicial_confirmado),
                            $this->formatHorometro((float) $data['horometro_final_confirmado']),
                        ),
                    ],
                ]);
            }

            $horasTrabajadas = round(
                (float) $data['horometro_final_confirmado'] - (float) $registro->horometro_inicial_confirmado,
                2,
            );

            $estado = 'COMPLETO';
            $observacion = $registro->observacion;

            if ($horasTrabajadas > (float) $config->tolerancia_maxima_horas_dia) {
                $estado = 'OBSERVADO';
                $observacion = 'Las horas trabajadas superan la tolerancia maxima configurada.';
            }

            $registro->update([
                'usuario_responsable_id' => $user->id,
                'horometro_final_ocr' => $data['horometro_final_ocr'] ?? null,
                'horometro_final_confirmado' => $data['horometro_final_confirmado'],
                'foto_final' => $data['foto_final'] ?? $registro->foto_final,
                'fecha_hora_final' => $fechaHora,
                'correccion_manual_final' => (bool) ($data['correccion_manual_final'] ?? false),
                'horas_trabajadas' => $horasTrabajadas,
                'estado' => $estado,
                'observacion' => $observacion,
            ]);

            $this->consumirReapertura($reapertura);

            return $this->loadRegistro($registro);
        });
    }

    public function reabrir(
        HorometroRegistro $registro,
        string $tipoRegistro,
        User $user,
        ?string $motivo = null,
        ?CarbonImmutable $vigenteHasta = null,
    ): HorometroReapertura
    {
        return DB::transaction(function () use ($registro, $tipoRegistro, $user, $motivo, $vigenteHasta) {
            $estadoPosterior = $tipoRegistro === 'INICIO' ? 'PENDIENTE_INICIO' : 'SIN_CIERRE';

            $reapertura = HorometroReapertura::query()->create([
                'vehiculo_id' => $registro->vehiculo_id,
                'fecha' => $registro->fecha,
                'tipo_registro' => $tipoRegistro,
                'usuario_id' => $user->id,
                'fecha_hora' => now(),
                'estado_anterior' => $registro->estado,
                'estado_posterior' => $estadoPosterior,
                'motivo' => $motivo,
                'vigente_hasta' => $vigenteHasta,
            ]);

            $registro->update([
                'estado' => $estadoPosterior,
                ...$this->camposLimpiadosPorReapertura($tipoRegistro),
            ]);

            return $reapertura->load(['vehiculo', 'usuario']);
        });
    }

    public function crearReaperturaManual(
        int $vehiculoId,
        string $fecha,
        string $tipoRegistro,
        User $user,
        string $motivo,
        ?CarbonImmutable $vigenteHasta = null,
    ): HorometroReapertura {
        $estadoPosterior = $tipoRegistro === 'INICIO' ? 'PENDIENTE_INICIO' : 'SIN_CIERRE';

        return HorometroReapertura::query()
            ->create([
                'vehiculo_id' => $vehiculoId,
                'fecha' => $fecha,
                'tipo_registro' => $tipoRegistro,
                'usuario_id' => $user->id,
                'fecha_hora' => now(),
                'estado_anterior' => null,
                'estado_posterior' => $estadoPosterior,
                'motivo' => $motivo,
                'vigente_hasta' => $vigenteHasta,
            ])
            ->load(['vehiculo', 'usuario']);
    }

    public function anular(HorometroRegistro $registro, User $user): HorometroRegistro
    {
        $registro->update([
            'usuario_responsable_id' => $user->id,
            'estado' => 'ANULADO',
        ]);

        return $this->loadRegistro($registro);
    }

    private function validarHorarioInicio(CarbonImmutable $fechaHora): void
    {
        $config = $this->configuracion();
        $hora = $fechaHora->format('H:i:s');

        if ($hora < $config->hora_inicio_desde || $hora > $config->hora_inicio_hasta) {
            throw ValidationException::withMessages([
                'fecha_hora_inicio' => ['El inicio debe registrarse entre 07:00 y 08:00, salvo reapertura.'],
            ]);
        }
    }

    private function validarHorarioCierre(CarbonImmutable $fechaHora): void
    {
        $config = $this->configuracion();

        if ($fechaHora->format('H:i:s') > $config->hora_cierre_hasta) {
            throw ValidationException::withMessages([
                'fecha_hora_final' => ['El cierre debe registrarse hasta las 19:30, salvo reapertura.'],
            ]);
        }
    }

    private function validarContinuidadInicio(int $vehiculoId, string $fecha, float $horometroInicial): void
    {
        $cierreAnterior = HorometroRegistro::query()
            ->where('vehiculo_id', $vehiculoId)
            ->whereDate('fecha', CarbonImmutable::parse($fecha)->subDay()->toDateString())
            ->whereNotNull('horometro_final_confirmado')
            ->value('horometro_final_confirmado');

        $tolerancia = (float) $this->configuracion()->tolerancia_inicio_horas;

        if ($cierreAnterior === null) {
            return;
        }

        $ultimoValido = round((float) $cierreAnterior, 2);
        $valorIngresado = round($horometroInicial, 2);

        if (abs($ultimoValido - $valorIngresado) <= $tolerancia) {
            return;
        }

        $comparacion = $valorIngresado < $ultimoValido ? 'menor' : 'mayor';

        throw ValidationException::withMessages([
            'horometro_inicial_confirmado' => [
                sprintf(
                    'El horómetro inicial no puede ser %s al cierre del día anterior. Último horómetro válido: %s. Valor ingresado: %s. Tolerancia permitida: %s.',
                    $comparacion,
                    $this->formatHorometro($ultimoValido),
                    $this->formatHorometro($valorIngresado),
                    $this->formatHorometro($tolerancia),
                ),
            ],
        ]);
    }

    private function reaperturaDisponible(int $vehiculoId, string $fecha, string $tipoRegistro): ?HorometroReapertura
    {
        return HorometroReapertura::query()
            ->where('vehiculo_id', $vehiculoId)
            ->whereDate('fecha', $fecha)
            ->where('tipo_registro', $tipoRegistro)
            ->whereNull('consumida_at')
            ->where(function ($query) {
                $query->whereNull('vigente_hasta')
                    ->orWhere('vigente_hasta', '>=', now());
            })
            ->latest()
            ->first();
    }

    private function validarCorreccionManual(bool $corrige, HorometroConfiguracion $config, string $field): void
    {
        if ($corrige && ! $config->permite_correccion_manual) {
            throw ValidationException::withMessages([
                $field => ['La correccion manual esta deshabilitada en la configuracion del modulo.'],
            ]);
        }
    }

    private function consumirReapertura(?HorometroReapertura $reapertura): void
    {
        $reapertura?->update(['consumida_at' => now()]);
    }

    /**
     * @return array<string, mixed>
     */
    private function camposLimpiadosPorReapertura(string $tipoRegistro): array
    {
        $cierre = [
            'horometro_final_ocr' => null,
            'horometro_final_confirmado' => null,
            'foto_final' => null,
            'fecha_hora_final' => null,
            'correccion_manual_final' => false,
            'horas_trabajadas' => null,
        ];

        if ($tipoRegistro === 'CIERRE') {
            return $cierre;
        }

        return [
            'horometro_inicial_ocr' => null,
            'horometro_inicial_confirmado' => null,
            'foto_inicial' => null,
            'fecha_hora_inicio' => null,
            'correccion_manual_inicio' => false,
            ...$cierre,
        ];
    }

    private function configuracion(): HorometroConfiguracion
    {
        return HorometroConfiguracion::query()->first()
            ?? HorometroConfiguracion::query()->create([]);
    }

    private function fechaHora(?string $value): CarbonImmutable
    {
        return $value ? CarbonImmutable::parse($value) : CarbonImmutable::now();
    }

    private function formatHorometro(float $value): string
    {
        return number_format($value, 2, '.', '');
    }

    private function loadRegistro(HorometroRegistro $registro): HorometroRegistro
    {
        return $registro->refresh()->load(['vehiculo.tipoVehiculo', 'operario', 'usuarioResponsable', 'fundo', 'sector', 'lote']);
    }
}
