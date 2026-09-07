<?php

namespace Tests\Feature;

use App\Models\Gerencia;
use App\Models\HorometroRegistro;
use App\Models\OrdenTrabajo;
use App\Models\Personal;
use App\Models\TipoFalla;
use App\Models\User;
use App\Models\Vehiculo;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TallerApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_take_request_part_and_resolve_backlog_work_order(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $tecnico = $this->tecnico();

        $ordenResponse = $this
            ->withToken($token)
            ->postJson('/api/taller/ordenes', [
                'vehiculo_id' => Vehiculo::where('codigo', 'TR-015')->value('id'),
                'gerencia_id' => Gerencia::where('codigo', 'GEN')->value('id'),
                'tipo_falla_id' => TipoFalla::where('nombre', 'Motor')->value('id'),
                'detalle_reporte' => 'Motor pierde potencia en campo.',
                'estado_equipo' => 'FUERA_DE_SERVICIO',
            ]);

        $ordenResponse
            ->assertCreated()
            ->assertJsonPath('data.estado', 'PENDIENTE')
            ->assertJsonPath('data.eventos.0.evento', 'OT creada');

        $ordenId = $ordenResponse->json('data.id');
        $this->assertStringStartsWith('OT-', $ordenResponse->json('data.numero_ot'));

        $this
            ->withToken($token)
            ->postJson("/api/taller/ordenes/{$ordenId}/tomar", [
                'tecnico_id' => $tecnico->id,
                'tipo_atencion' => 'TALLER',
            ])
            ->assertOk()
            ->assertJsonPath('data.estado', 'EN_CURSO')
            ->assertJsonPath('data.tecnico.dni', '12345678');

        $this
            ->withToken($token)
            ->postJson("/api/taller/ordenes/{$ordenId}/repuestos", [
                'tecnico_id' => $tecnico->id,
                'descripcion_solicitada' => 'Filtro de combustible',
                'cantidad' => 1,
            ])
            ->assertCreated()
            ->assertJsonPath('data.estado', 'SOLICITADO');

        $orden = OrdenTrabajo::findOrFail($ordenId);
        $this->assertSame('ESPERANDO_REPUESTO', $orden->estado);

        $repuestoId = $orden->repuestos()->value('id');

        $this
            ->withToken($token)
            ->postJson("/api/taller/repuestos/{$repuestoId}/marcar-disponible")
            ->assertOk()
            ->assertJsonPath('data.estado', 'DISPONIBLE');

        $this
            ->withToken($token)
            ->postJson("/api/taller/repuestos/{$repuestoId}/confirmar-recojo")
            ->assertOk()
            ->assertJsonPath('data.estado', 'ENTREGADO');

        $this
            ->withToken($token)
            ->postJson("/api/taller/ordenes/{$ordenId}/finalizar", [
                'diagnostico' => 'Filtro obstruido.',
                'trabajo_realizado' => 'Se cambió filtro y se verificó encendido.',
                'trabajo_pendiente' => 'Revisar bomba de combustible.',
                'estado_equipo' => 'OPERATIVO_CON_PENDIENTE',
            ])
            ->assertOk()
            ->assertJsonPath('data.estado', 'FINALIZADA_CON_PENDIENTE')
            ->assertJsonPath('data.estado_equipo', 'OPERATIVO_CON_PENDIENTE');

        $this
            ->withToken($token)
            ->getJson('/api/taller/backlog')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this
            ->withToken($token)
            ->postJson("/api/taller/backlog/{$ordenId}/resolver")
            ->assertOk()
            ->assertJsonPath('data.estado', 'FINALIZADA');

        $this->assertDatabaseHas('orden_trabajo_eventos', [
            'orden_trabajo_id' => $ordenId,
            'evento' => 'Backlog resuelto',
        ]);
    }

    public function test_taller_dashboard_counts_current_states(): void
    {
        $this->seed(DatabaseSeeder::class);

        OrdenTrabajo::query()->create([
            'numero_ot' => 'OT-2026-000001',
            'vehiculo_id' => Vehiculo::where('codigo', 'TR-008')->value('id'),
            'gerencia_id' => Gerencia::where('codigo', 'GEN')->value('id'),
            'tipo_falla_id' => TipoFalla::where('nombre', 'Motor')->value('id'),
            'detalle_reporte' => 'Prueba dashboard',
            'estado' => 'PENDIENTE',
            'estado_equipo' => 'FUERA_DE_SERVICIO',
            'fecha_reporte' => now(),
        ]);

        $this
            ->withToken($this->adminToken())
            ->getJson('/api/taller/dashboard')
            ->assertOk()
            ->assertJsonPath('data.ordenes.pendientes', 1);

        $this
            ->withToken($this->adminToken())
            ->getJson('/api/taller/reportes/equipos')
            ->assertOk()
            ->assertJsonPath('data.0.total_ordenes', 1);
    }

    public function test_preventive_maintenance_uses_current_hourmeter(): void
    {
        $this->seed(DatabaseSeeder::class);

        $vehiculo = Vehiculo::where('codigo', 'TR-015')->firstOrFail();

        HorometroRegistro::query()->create([
            'vehiculo_id' => $vehiculo->id,
            'fecha' => '2026-08-26',
            'horometro_inicial_confirmado' => 240,
            'foto_inicial' => 'inicio.jpg',
            'fecha_hora_inicio' => '2026-08-26 07:20:00',
            'horometro_final_confirmado' => 248,
            'foto_final' => 'final.jpg',
            'fecha_hora_final' => '2026-08-26 18:00:00',
            'horas_trabajadas' => 8,
            'estado' => 'COMPLETO',
        ]);

        $this
            ->withToken($this->adminToken())
            ->getJson('/api/taller/preventivos')
            ->assertOk()
            ->assertJsonPath('resumen.proximos', 1)
            ->assertJsonPath('data.0.vehiculo.codigo', 'TR-015')
            ->assertJsonPath('data.0.preventivo.estado', 'PROXIMO')
            ->assertJsonPath('data.0.preventivo.plan_critico.nombre', 'Servicio 250 h');
    }

    public function test_user_without_taller_permission_cannot_create_work_order(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::factory()->create([
            'email' => 'sin.taller@agrocontrol.local',
        ]);
        $user->givePermissionTo('maestros.ver');

        $this
            ->withToken($user->createToken('feature-test')->plainTextToken)
            ->postJson('/api/taller/ordenes', [])
            ->assertForbidden();
    }

    private function adminToken(): string
    {
        $admin = User::where('email', 'admin@agrocontrol.local')->firstOrFail();

        return $admin->createToken('feature-test')->plainTextToken;
    }

    private function tecnico(): Personal
    {
        return Personal::query()->create([
            'dni' => '12345678',
            'nombres' => 'Carlos',
            'apellidos' => 'Mecánico',
            'tipo' => 'TECNICO',
            'gerencia_id' => Gerencia::where('codigo', 'GEN')->value('id'),
            'estado' => 'ACTIVO',
        ]);
    }
}
