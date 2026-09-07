<?php

namespace Tests\Feature;

use App\Models\HorometroRegistro;
use App\Models\Fundo;
use App\Models\Lote;
use App\Models\Personal;
use App\Models\Sector;
use App\Models\Sede;
use App\Models\User;
use App\Models\Vehiculo;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HorometrosApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_register_start_and_close_hourmeter_record(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $vehiculoId = Vehiculo::where('codigo', 'TR-015')->value('id');
        $operario = $this->operario();
        $sede = Sede::where('codigo', 'LOCAL')->firstOrFail();
        $fundo = Fundo::query()->create([
            'sede_id' => $sede->id,
            'codigo' => 'FND-TEST',
            'nombre' => 'Fundo Test',
            'estado' => 'ACTIVO',
        ]);
        $sector = Sector::query()->create([
            'fundo_id' => $fundo->id,
            'codigo' => 'SEC-TEST',
            'nombre' => 'Sector Test',
            'estado' => 'ACTIVO',
        ]);
        $lote = Lote::query()->create([
            'sector_id' => $sector->id,
            'codigo' => 'LOT-TEST',
            'nombre' => 'Lote Test',
            'estado' => 'ACTIVO',
        ]);

        $inicio = $this
            ->withToken($token)
            ->postJson('/api/horometros/inicio', [
                'vehiculo_id' => $vehiculoId,
                'fecha' => '2026-08-26',
                'operario_id' => $operario->id,
                'fundo_id' => $fundo->id,
                'lote_id' => $lote->id,
                'horometro_inicial_ocr' => 100,
                'horometro_inicial_confirmado' => 100,
                'foto_inicial' => 'horometros/2026/08/26/TR-015/inicio.jpg',
                'fecha_hora_inicio' => '2026-08-26 07:20:00',
                'correccion_manual_inicio' => false,
            ]);

        $inicio
            ->assertCreated()
            ->assertJsonPath('data.estado', 'EN_JORNADA')
            ->assertJsonPath('data.horometro_inicial_confirmado', '100.00')
            ->assertJsonPath('data.fundo.id', $fundo->id)
            ->assertJsonPath('data.sector.id', $sector->id)
            ->assertJsonPath('data.lote.id', $lote->id);

        $registroId = $inicio->json('data.id');

        $this->assertDatabaseHas(HorometroRegistro::class, [
            'id' => $registroId,
            'fundo_id' => $fundo->id,
            'sector_id' => $sector->id,
            'lote_id' => $lote->id,
        ]);

        $this
            ->withToken($token)
            ->postJson("/api/horometros/{$registroId}/cierre", [
                'horometro_final_ocr' => 108.5,
                'horometro_final_confirmado' => 108.5,
                'foto_final' => 'horometros/2026/08/26/TR-015/final.jpg',
                'fecha_hora_final' => '2026-08-26 18:30:00',
                'correccion_manual_final' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.estado', 'COMPLETO')
            ->assertJsonPath('data.horas_trabajadas', '8.50');
    }

    public function test_start_can_store_base64_evidence_image(): void
    {
        config(['filesystems.evidence_disk' => 'public']);
        Storage::fake('public');
        $this->seed(DatabaseSeeder::class);

        $response = $this
            ->withToken($this->adminToken())
            ->postJson('/api/horometros/inicio', [
                'vehiculo_id' => Vehiculo::where('codigo', 'TR-008')->value('id'),
                'fecha' => '2026-08-26',
                'horometro_inicial_ocr' => 50,
                'horometro_inicial_confirmado' => 50,
                'foto_inicial_base64' => base64_encode('fake-jpeg-content'),
                'fecha_hora_inicio' => '2026-08-26 07:10:00',
            ]);

        $response->assertCreated();

        $path = $response->json('data.foto_inicial');

        $this->assertIsString($path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_start_outside_allowed_window_requires_reopening(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this
            ->withToken($this->adminToken())
            ->postJson('/api/horometros/inicio', [
                'vehiculo_id' => Vehiculo::where('codigo', 'TR-008')->value('id'),
                'fecha' => '2026-08-26',
                'horometro_inicial_confirmado' => 50,
                'foto_inicial' => 'inicio.jpg',
                'fecha_hora_inicio' => '2026-08-26 09:00:00',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'VALIDATION_ERROR')
            ->assertJsonValidationErrors(['fecha_hora_inicio']);
    }

    public function test_reopening_allows_out_of_window_close_and_is_consumed(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $registro = $this->registroEnJornada('2026-08-26', 200);

        $this
            ->withToken($token)
            ->postJson("/api/horometros/{$registro->id}/reabrir", [
                'tipo_registro' => 'CIERRE',
                'motivo' => 'Autorizacion operativa para cierre fuera de horario.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.tipo_registro', 'CIERRE');

        $this
            ->withToken($token)
            ->postJson("/api/horometros/{$registro->id}/cierre", [
                'horometro_final_confirmado' => 204,
                'foto_final' => 'final-reapertura.jpg',
                'fecha_hora_final' => '2026-08-26 21:15:00',
            ])
            ->assertOk()
            ->assertJsonPath('data.estado', 'COMPLETO')
            ->assertJsonPath('data.horas_trabajadas', '4.00');

        $this->assertDatabaseHas('horometro_reaperturas', [
            'vehiculo_id' => $registro->vehiculo_id,
            'tipo_registro' => 'CIERRE',
        ]);
        $this->assertNotNull($registro->refresh()->horometro_final_confirmado);
    }

    public function test_duplicate_daily_start_is_rejected_without_reopening(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $vehiculoId = Vehiculo::where('codigo', 'TR-015')->value('id');

        $payload = [
            'vehiculo_id' => $vehiculoId,
            'fecha' => '2026-08-27',
            'horometro_inicial_confirmado' => 300,
            'foto_inicial' => 'inicio.jpg',
            'fecha_hora_inicio' => '2026-08-27 07:10:00',
        ];

        $this->withToken($token)->postJson('/api/horometros/inicio', $payload)->assertCreated();
        $this
            ->withToken($token)
            ->postJson('/api/horometros/inicio', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['vehiculo_id']);
    }

    public function test_continuity_mismatch_is_rejected_with_last_valid_value(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $vehiculoId = Vehiculo::where('codigo', 'TR-015')->value('id');

        HorometroRegistro::query()->create([
            'vehiculo_id' => $vehiculoId,
            'fecha' => '2026-08-25',
            'horometro_inicial_confirmado' => 90,
            'foto_inicial' => 'inicio.jpg',
            'fecha_hora_inicio' => '2026-08-25 07:15:00',
            'horometro_final_confirmado' => 100,
            'foto_final' => 'final.jpg',
            'fecha_hora_final' => '2026-08-25 18:00:00',
            'horas_trabajadas' => 10,
            'estado' => 'COMPLETO',
        ]);

        $this
            ->withToken($token)
            ->postJson('/api/horometros/inicio', [
                'vehiculo_id' => $vehiculoId,
                'fecha' => '2026-08-26',
                'horometro_inicial_confirmado' => 101,
                'foto_inicial' => 'inicio-hoy.jpg',
                'fecha_hora_inicio' => '2026-08-26 07:30:00',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['horometro_inicial_confirmado'])
            ->assertJsonPath(
                'errors.horometro_inicial_confirmado.0',
                'El horómetro inicial no puede ser mayor al cierre del día anterior. Último horómetro válido: 100.00. Valor ingresado: 101.00. Tolerancia permitida: 0.00.',
            );
    }

    public function test_final_value_cannot_be_less_than_initial(): void
    {
        $this->seed(DatabaseSeeder::class);
        $registro = $this->registroEnJornada('2026-08-26', 500);

        $this
            ->withToken($this->adminToken())
            ->postJson("/api/horometros/{$registro->id}/cierre", [
                'horometro_final_confirmado' => 499,
                'foto_final' => 'final.jpg',
                'fecha_hora_final' => '2026-08-26 18:00:00',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['horometro_final_confirmado'])
            ->assertJsonPath(
                'errors.horometro_final_confirmado.0',
                'El horómetro final no puede ser menor al horómetro inicial. Horómetro inicial válido: 500.00. Valor ingresado: 499.00.',
            );
    }

    public function test_dashboard_pending_validation_and_reports_work(): void
    {
        $this->seed(DatabaseSeeder::class);
        $registro = $this->registroEnJornada('2026-08-26', 700);
        $registro->update([
            'horometro_final_confirmado' => 703,
            'foto_final' => 'final.jpg',
            'fecha_hora_final' => '2026-08-26 18:00:00',
            'horas_trabajadas' => 3,
            'estado' => 'COMPLETO',
        ]);

        $token = $this->adminToken();

        $this
            ->withToken($token)
            ->getJson('/api/horometros/dashboard?fecha=2026-08-26')
            ->assertOk()
            ->assertJsonPath('data.completos', 1);

        $this
            ->withToken($token)
            ->getJson('/api/horometros/reportes?fecha_desde=2026-08-26&fecha_hasta=2026-08-26')
            ->assertOk()
            ->assertJsonPath('data.horas_totales', 3);
    }

    public function test_user_without_horometros_permission_cannot_register_start(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::factory()->create([
            'email' => 'sin.horometros@agrocontrol.local',
        ]);
        $user->givePermissionTo('maestros.ver');

        $this
            ->withToken($user->createToken('feature-test')->plainTextToken)
            ->postJson('/api/horometros/inicio', [])
            ->assertForbidden();
    }

    private function adminToken(): string
    {
        return User::where('email', 'admin@agrocontrol.local')
            ->firstOrFail()
            ->createToken('feature-test')
            ->plainTextToken;
    }

    private function operario(): Personal
    {
        return Personal::query()->create([
            'dni' => '87654321',
            'nombres' => 'Luis',
            'apellidos' => 'Operario',
            'tipo' => 'OPERARIO',
            'estado' => 'ACTIVO',
        ]);
    }

    private function registroEnJornada(string $fecha, float $inicial): HorometroRegistro
    {
        return HorometroRegistro::query()->create([
            'vehiculo_id' => Vehiculo::where('codigo', 'TR-015')->value('id'),
            'fecha' => $fecha,
            'horometro_inicial_confirmado' => $inicial,
            'foto_inicial' => 'inicio.jpg',
            'fecha_hora_inicio' => "{$fecha} 07:15:00",
            'estado' => 'EN_JORNADA',
        ]);
    }
}
