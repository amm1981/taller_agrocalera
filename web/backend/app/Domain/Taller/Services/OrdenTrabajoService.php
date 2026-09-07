<?php

namespace App\Domain\Taller\Services;

use App\Models\OrdenTrabajo;
use App\Models\SolicitudRepuesto;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrdenTrabajoService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function crear(array $data, User $user): OrdenTrabajo
    {
        return DB::transaction(function () use ($data, $user) {
            $orden = OrdenTrabajo::query()->create([
                ...$data,
                'estado' => 'PENDIENTE',
                'fecha_reporte' => $data['fecha_reporte'] ?? now(),
                'estado_equipo' => $data['estado_equipo'] ?? 'FUERA_DE_SERVICIO',
            ]);

            $orden->update([
                'numero_ot' => sprintf('OT-%s-%06d', $orden->fecha_reporte->format('Y'), $orden->id),
            ]);

            $orden->vehiculo()->update(['estado' => $orden->estado_equipo]);
            $this->registrarEvento($orden, $user, 'OT creada', null, 'PENDIENTE');

            return $this->loadOrden($orden);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function tomar(OrdenTrabajo $orden, array $data, User $user): OrdenTrabajo
    {
        if ($orden->estado !== 'PENDIENTE') {
            throw ValidationException::withMessages([
                'estado' => ['Solo una OT pendiente puede ser tomada.'],
            ]);
        }

        return DB::transaction(function () use ($orden, $data, $user) {
            $estadoAnterior = $orden->estado;

            $orden->update([
                'tecnico_id' => $data['tecnico_id'],
                'tipo_atencion' => $data['tipo_atencion'],
                'estado' => 'EN_CURSO',
                'fecha_inicio_atencion' => now(),
            ]);

            $this->registrarEvento($orden, $user, 'OT tomada', $estadoAnterior, 'EN_CURSO', [
                'tecnico_id' => $data['tecnico_id'],
                'tipo_atencion' => $data['tipo_atencion'],
            ]);
            $this->registrarEvento($orden, $user, 'Atención iniciada', $estadoAnterior, 'EN_CURSO');

            return $this->loadOrden($orden);
        });
    }

    public function iniciar(OrdenTrabajo $orden, User $user): OrdenTrabajo
    {
        if (! in_array($orden->estado, ['PENDIENTE', 'EN_CURSO'], true)) {
            throw ValidationException::withMessages([
                'estado' => ['La OT no puede iniciar atención desde su estado actual.'],
            ]);
        }

        return DB::transaction(function () use ($orden, $user) {
            $estadoAnterior = $orden->estado;

            $orden->update([
                'estado' => 'EN_CURSO',
                'fecha_inicio_atencion' => $orden->fecha_inicio_atencion ?? now(),
            ]);

            $this->registrarEvento($orden, $user, 'Atención iniciada', $estadoAnterior, 'EN_CURSO');

            return $this->loadOrden($orden);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function guardarAvance(OrdenTrabajo $orden, array $data, User $user): OrdenTrabajo
    {
        return DB::transaction(function () use ($orden, $data, $user) {
            $orden->update($data);

            $this->registrarEvento($orden, $user, 'Avance guardado', $orden->estado, $orden->estado, [
                'campos' => array_keys($data),
            ]);

            return $this->loadOrden($orden);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function solicitarRepuesto(OrdenTrabajo $orden, array $data, User $user): SolicitudRepuesto
    {
        return DB::transaction(function () use ($orden, $data, $user) {
            $estadoAnterior = $orden->estado;

            $repuesto = SolicitudRepuesto::query()->create([
                ...$data,
                'orden_trabajo_id' => $orden->id,
                'estado' => 'SOLICITADO',
                'fecha_solicitud' => now(),
            ]);

            $orden->update(['estado' => 'ESPERANDO_REPUESTO']);

            $this->registrarEvento($orden, $user, 'Repuesto solicitado', $estadoAnterior, 'ESPERANDO_REPUESTO', [
                'solicitud_repuesto_id' => $repuesto->id,
            ]);

            return $repuesto->load(['ordenTrabajo', 'tecnico']);
        });
    }

    public function marcarRepuestoDisponible(SolicitudRepuesto $repuesto, User $user): SolicitudRepuesto
    {
        return DB::transaction(function () use ($repuesto, $user) {
            $repuesto->update([
                'estado' => 'DISPONIBLE',
                'fecha_disponible' => now(),
            ]);

            $this->registrarEvento(
                $repuesto->ordenTrabajo,
                $user,
                'Repuesto disponible',
                $repuesto->ordenTrabajo->estado,
                $repuesto->ordenTrabajo->estado,
                ['solicitud_repuesto_id' => $repuesto->id],
            );

            return $repuesto->refresh()->load(['ordenTrabajo', 'tecnico']);
        });
    }

    public function confirmarRecojoRepuesto(SolicitudRepuesto $repuesto, User $user): SolicitudRepuesto
    {
        return DB::transaction(function () use ($repuesto, $user) {
            $orden = $repuesto->ordenTrabajo;
            $estadoAnterior = $orden->estado;

            $repuesto->update([
                'estado' => 'ENTREGADO',
                'fecha_entrega' => now(),
            ]);

            if ($orden->estado === 'ESPERANDO_REPUESTO') {
                $orden->update(['estado' => 'EN_CURSO']);
            }

            $this->registrarEvento($orden, $user, 'Repuesto recogido', $estadoAnterior, $orden->refresh()->estado, [
                'solicitud_repuesto_id' => $repuesto->id,
            ]);
            $this->registrarEvento($orden, $user, 'Trabajo reanudado', $estadoAnterior, $orden->estado);

            return $repuesto->refresh()->load(['ordenTrabajo', 'tecnico']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function finalizar(OrdenTrabajo $orden, array $data, User $user): OrdenTrabajo
    {
        if (in_array($orden->estado, ['FINALIZADA', 'FINALIZADA_CON_PENDIENTE'], true)) {
            throw ValidationException::withMessages([
                'estado' => ['La OT ya está finalizada.'],
            ]);
        }

        return DB::transaction(function () use ($orden, $data, $user) {
            $estadoAnterior = $orden->estado;
            $tienePendiente = ! empty($data['trabajo_pendiente'] ?? null);
            $estadoNuevo = $tienePendiente ? 'FINALIZADA_CON_PENDIENTE' : 'FINALIZADA';
            $fechaPendiente = $estadoNuevo === 'FINALIZADA_CON_PENDIENTE' ? now() : null;

            $orden->update([
                'diagnostico' => $data['diagnostico'] ?? $orden->diagnostico,
                'trabajo_realizado' => $data['trabajo_realizado'],
                'trabajo_pendiente' => $data['trabajo_pendiente'],
                'estado' => $estadoNuevo,
                'estado_equipo' => $data['estado_equipo'],
                'fecha_finalizacion' => now(),
                'fecha_pendiente' => $fechaPendiente,
            ]);

            $orden->vehiculo()->update(['estado' => $data['estado_equipo']]);
            $this->registrarEvento($orden, $user, 'OT finalizada', $estadoAnterior, $estadoNuevo);

            if ($estadoNuevo === 'FINALIZADA_CON_PENDIENTE') {
                $this->registrarEvento($orden, $user, 'Backlog generado', $estadoAnterior, $estadoNuevo);
            }

            return $this->loadOrden($orden);
        });
    }

    public function resolverBacklog(OrdenTrabajo $orden, User $user): OrdenTrabajo
    {
        if ($orden->estado !== 'FINALIZADA_CON_PENDIENTE') {
            throw ValidationException::withMessages([
                'estado' => ['Solo una OT finalizada con pendiente puede resolverse desde backlog.'],
            ]);
        }

        return DB::transaction(function () use ($orden, $user) {
            $estadoAnterior = $orden->estado;

            $orden->update([
                'estado' => 'FINALIZADA',
                'estado_equipo' => 'OPERATIVO',
                'fecha_resolucion' => now(),
            ]);

            $orden->vehiculo()->update(['estado' => 'OPERATIVO']);
            $this->registrarEvento($orden, $user, 'Backlog resuelto', $estadoAnterior, 'FINALIZADA');

            return $this->loadOrden($orden);
        });
    }

    /**
     * @param  array<string, mixed>|null  $metadata
     */
    private function registrarEvento(
        OrdenTrabajo $orden,
        User $user,
        string $evento,
        ?string $estadoAnterior,
        ?string $estadoNuevo,
        ?array $metadata = null,
    ): void {
        $orden->eventos()->create([
            'usuario_id' => $user->id,
            'evento' => $evento,
            'estado_anterior' => $estadoAnterior,
            'estado_nuevo' => $estadoNuevo,
            'metadata' => $metadata,
        ]);
    }

    private function loadOrden(OrdenTrabajo $orden): OrdenTrabajo
    {
        return $orden->refresh()->load([
            'vehiculo',
            'gerencia',
            'tipoFalla',
            'reportadoPor',
            'tecnico',
            'repuestos.tecnico',
            'eventos.usuario',
        ]);
    }
}
