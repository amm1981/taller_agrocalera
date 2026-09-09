<?php

namespace App\Domain\Horometros\Services;

use App\Models\HorometroConfiguracion;
use App\Models\HorometroReapertura;
use App\Models\HorometroRegistro;
use App\Models\User;
use App\Models\UsuarioAplicativo;
use App\Models\Vehiculo;
use App\Models\VehiculoPuntoMedida;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class HorometroService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function registrarInicio(array $data, User|UsuarioAplicativo $user): HorometroRegistro
    {
        return DB::transaction(function () use ($data, $user) {
            $vehiculo = Vehiculo::query()->lockForUpdate()->findOrFail($data['vehiculo_id']);
            if (! empty($data['client_reference'])) {
                $existing = HorometroRegistro::query()->where('client_reference', $data['client_reference'])->first();
                if ($existing !== null) {
                    if ($existing->vehiculo_id !== $vehiculo->id || (float) $existing->horometro_inicial_confirmado !== (float) $data['horometro_inicial_confirmado']) {
                        throw ValidationException::withMessages(['client_reference' => ['La referencia de envio ya corresponde a otro registro.']]);
                    }

                    return $this->loadRegistro($existing);
                }
            }
            $fechaHora = $this->fechaHora($data['fecha_hora_inicio'] ?? null);
            $fecha = CarbonImmutable::parse($data['fecha'] ?? $fechaHora->toDateString(), config('app.timezone'))->toDateString();
            $reapertura = $this->reaperturaDisponible((int) $data['vehiculo_id'], $fecha, 'INICIO');
            $config = $this->configuracion($vehiculo->tipo_vehiculo_id);

            if (! $reapertura) {
                $this->validarHorarioInicio($fechaHora, $config);
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

            if ($registro->exists && ! $reapertura && $registro->horometro_inicial_confirmado !== null) {
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
                'client_reference' => $data['client_reference'] ?? null,
                'operario_id' => $data['operario_id'] ?? $registro->operario_id,
                'usuario_responsable_id' => $user instanceof User ? $user->id : $registro->usuario_responsable_id,
                'usuario_aplicativo_id' => $user instanceof UsuarioAplicativo ? $user->id : $registro->usuario_aplicativo_id,
                'fundo_id' => $data['fundo_id'] ?? $registro->fundo_id,
                'sector_id' => $data['sector_id'] ?? $registro->sector_id,
                'lote_id' => $data['lote_id'] ?? $registro->lote_id,
                'punto_medida' => $this->puntoMedidaVigente($vehiculo, $fecha),
                'horometro_inicial_ocr' => $data['horometro_inicial_ocr'] ?? null,
                'horometro_inicial_confirmado' => $data['horometro_inicial_confirmado'],
                'foto_inicial' => $data['foto_inicial'] ?? $registro->foto_inicial,
                'fecha_hora_inicio' => $fechaHora,
                'correccion_manual_inicio' => (bool) ($data['correccion_manual_inicio'] ?? false),
                'estado' => 'EN_JORNADA',
                'observacion' => null,
            ])->save();

            if ($this->referenciaValida($vehiculo->horometro_base) === null && $this->referenciaValida($data['horometro_inicial_confirmado']) !== null) {
                $vehiculo->update(['horometro_base' => $data['horometro_inicial_confirmado']]);
            }

            $this->consumirReapertura($reapertura);

            return $this->loadRegistro($registro);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function registrarCierre(HorometroRegistro $registro, array $data, User|UsuarioAplicativo $user): HorometroRegistro
    {
        return DB::transaction(function () use ($registro, $data, $user) {
            $vehiculo = Vehiculo::query()->lockForUpdate()->findOrFail($registro->vehiculo_id);
            $registro->refresh();
            $fechaHora = $this->fechaHora($data['fecha_hora_final'] ?? null);
            $reapertura = $this->reaperturaDisponible($registro->vehiculo_id, $registro->fecha->toDateString(), 'CIERRE');
            $config = $this->configuracion($vehiculo->tipo_vehiculo_id);

            if (! $reapertura) {
                $this->validarHorarioCierre($fechaHora, $config);
            }

            $this->validarCorreccionManual((bool) ($data['correccion_manual_final'] ?? false), $config, 'correccion_manual_final');

            if ($registro->horometro_inicial_confirmado === null) {
                throw ValidationException::withMessages([
                    'horometro_inicial_confirmado' => ['El registro no tiene horómetro inicial.'],
                ]);
            }

            $referenciaAnterior = $this->ultimaReferenciaValida($vehiculo->id, excluirRegistroId: $registro->id)
                ?? $this->referenciaValida($vehiculo->horometro_base);
            $referenciaBaseCierre = $this->referenciaValida($registro->horometro_inicial_confirmado) ?? $referenciaAnterior;
            if ($referenciaAnterior !== null && (float) $data['horometro_final_confirmado'] < $referenciaAnterior) {
                throw ValidationException::withMessages([
                    'horometro_final_confirmado' => ['El cierre no puede ser menor al ultimo horometro valido: '.$this->formatHorometro($referenciaAnterior).'.'],
                ]);
            }

            if ($referenciaBaseCierre !== null && (float) $data['horometro_final_confirmado'] < $referenciaBaseCierre) {
                throw ValidationException::withMessages([
                    'horometro_final_confirmado' => [
                        sprintf(
                            'El horómetro final no puede ser menor al horómetro inicial. Horómetro inicial válido: %s. Valor ingresado: %s.',
                            $this->formatHorometro($referenciaBaseCierre),
                            $this->formatHorometro((float) $data['horometro_final_confirmado']),
                        ),
                    ],
                ]);
            }

            $horasTrabajadas = $referenciaBaseCierre === null
                ? 0.0
                : round((float) $data['horometro_final_confirmado'] - $referenciaBaseCierre, 2);

            $estado = 'COMPLETO';
            $observacion = null;

            if ($horasTrabajadas > (float) $config->tolerancia_maxima_horas_dia) {
                throw ValidationException::withMessages([
                    'horometro_final_confirmado' => [
                        sprintf(
                            'El cierre supera la tolerancia máxima configurada. Horas calculadas: %s h. Máximo permitido: %s h.',
                            $this->formatHorometro($horasTrabajadas),
                            $this->formatHorometro((float) $config->tolerancia_maxima_horas_dia),
                        ),
                    ],
                ]);
            }

            $registro->update([
                'usuario_responsable_id' => $user instanceof User ? $user->id : $registro->usuario_responsable_id,
                'usuario_aplicativo_id' => $user instanceof UsuarioAplicativo ? $user->id : $registro->usuario_aplicativo_id,
                'punto_medida' => $registro->punto_medida ?? $this->puntoMedidaVigente($vehiculo, $registro->fecha->toDateString()),
                'horometro_final_ocr' => $data['horometro_final_ocr'] ?? null,
                'horometro_final_confirmado' => $data['horometro_final_confirmado'],
                'foto_final' => $data['foto_final'] ?? $registro->foto_final,
                'fecha_hora_final' => $fechaHora,
                'correccion_manual_final' => (bool) ($data['correccion_manual_final'] ?? false),
                'horas_trabajadas' => $horasTrabajadas,
                'estado' => $estado,
                'observacion' => $observacion,
            ]);

            if ($this->referenciaValida($vehiculo->horometro_base) === null && $this->referenciaValida($data['horometro_final_confirmado']) !== null) {
                $vehiculo->update(['horometro_base' => $data['horometro_final_confirmado']]);
            }

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
    ): HorometroReapertura {
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

    private function validarHorarioInicio(CarbonImmutable $fechaHora, HorometroConfiguracion $config): void
    {
        $hora = $fechaHora->format('H:i:s');

        if ($hora < $config->hora_inicio_desde || $hora > $config->hora_inicio_hasta) {
            throw ValidationException::withMessages([
                'fecha_hora_inicio' => [
                    sprintf(
                        'El inicio debe registrarse entre %s y %s, salvo reapertura.',
                        $this->formatHora($config->hora_inicio_desde),
                        $this->formatHora($config->hora_inicio_hasta),
                    ),
                ],
            ]);
        }
    }

    private function validarHorarioCierre(CarbonImmutable $fechaHora, HorometroConfiguracion $config): void
    {
        if ($fechaHora->format('H:i:s') > $config->hora_cierre_hasta) {
            throw ValidationException::withMessages([
                'fecha_hora_final' => [
                    sprintf(
                        'El cierre debe registrarse hasta las %s, salvo reapertura.',
                        $this->formatHora($config->hora_cierre_hasta),
                    ),
                ],
            ]);
        }
    }

    private function validarContinuidadInicio(int $vehiculoId, string $fecha, float $horometroInicial): void
    {
        $cierreAnterior = $this->ultimaReferenciaValida($vehiculoId, antesDeFecha: $fecha)
            ?? $this->referenciaValida(Vehiculo::query()->whereKey($vehiculoId)->value('horometro_base'));

        $tipoVehiculoId = Vehiculo::query()->whereKey($vehiculoId)->value('tipo_vehiculo_id');
        $tolerancia = (float) $this->configuracion($tipoVehiculoId)->tolerancia_inicio_horas;

        if ($cierreAnterior === null) {
            return;
        }

        $ultimoValido = round((float) $cierreAnterior, 2);
        $valorIngresado = round($horometroInicial, 2);

        if ($valorIngresado >= $ultimoValido && round(abs($ultimoValido - $valorIngresado), 2) <= $tolerancia) {
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

    private function configuracion(?int $tipoVehiculoId = null): HorometroConfiguracion
    {
        if ($tipoVehiculoId) {
            return HorometroConfiguracion::query()
                ->where('tipo_vehiculo_id', $tipoVehiculoId)
                ->first()
                ?? HorometroConfiguracion::query()->create(['tipo_vehiculo_id' => $tipoVehiculoId]);
        }

        return HorometroConfiguracion::query()->whereNull('tipo_vehiculo_id')->first()
            ?? HorometroConfiguracion::query()->first()
            ?? HorometroConfiguracion::query()->create([]);
    }

    private function fechaHora(?string $value): CarbonImmutable
    {
        return $value
            ? CarbonImmutable::parse($value, config('app.timezone'))->setTimezone(config('app.timezone'))
            : CarbonImmutable::now(config('app.timezone'));
    }

    private function formatHorometro(float $value): string
    {
        return number_format($value, 2, '.', '');
    }

    private function formatHora(string $value): string
    {
        return CarbonImmutable::parse($value, config('app.timezone'))->format('H:i');
    }

    private function referenciaValida(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $reference = round((float) $value, 2);

        return $reference > 0 ? $reference : null;
    }

    private function ultimaReferenciaValida(int $vehiculoId, ?string $antesDeFecha = null, ?int $excluirRegistroId = null): ?float
    {
        return HorometroRegistro::query()
            ->where('vehiculo_id', $vehiculoId)
            ->when($antesDeFecha, fn ($query, string $fecha) => $query->whereDate('fecha', '<', $fecha))
            ->when($excluirRegistroId, fn ($query, int $id) => $query->whereKeyNot($id))
            ->where(function ($query) {
                $query->where('horometro_final_confirmado', '>', 0)
                    ->orWhere('horometro_inicial_confirmado', '>', 0);
            })
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->get()
            ->map(fn (HorometroRegistro $registro) => $this->referenciaValida($registro->horometro_final_confirmado)
                ?? $this->referenciaValida($registro->horometro_inicial_confirmado))
            ->first();
    }

    private function puntoMedidaVigente(Vehiculo $vehiculo, string $fecha): ?string
    {
        $punto = VehiculoPuntoMedida::query()
            ->where('vehiculo_id', $vehiculo->id)
            ->whereDate('vigente_desde', '<=', $fecha)
            ->orderByDesc('vigente_desde')
            ->orderByDesc('id')
            ->value('punto_medida');

        return $punto ?: $vehiculo->punto_medida;
    }

    private function loadRegistro(HorometroRegistro $registro): HorometroRegistro
    {
        return $registro->refresh()->load(['vehiculo.tipoVehiculo', 'operario', 'usuarioResponsable', 'usuarioAplicativo', 'fundo', 'sector', 'lote']);
    }
}
