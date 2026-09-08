<?php

namespace Tests\Feature;

use App\Models\Fundo;
use App\Models\HorometroConfiguracion;
use App\Models\HorometroRegistro;
use App\Models\Lote;
use App\Models\Personal;
use App\Models\Sector;
use App\Models\Sede;
use App\Models\TipoVehiculo;
use App\Models\User;
use App\Models\UsuarioAplicativo;
use App\Models\Vehiculo;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

class HorometrosApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_manual_reading_sets_base_and_catalog_sync_exposes_it(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $vehicle = Vehiculo::where('codigo', 'TR-015')->firstOrFail();
        $vehicle->update(['horometro_base' => null]);

        $this->withToken($token)->postJson('/api/horometros/inicio', [
            'vehiculo_id' => $vehicle->id,
            'fecha' => '2026-09-01',
            'fecha_hora_inicio' => '2026-09-01 07:30:00',
            'horometro_inicial_confirmado' => 2500,
            'foto_inicial' => 'evidence.jpg',
        ])->assertCreated();

        $this->assertSame('2500.00', $vehicle->refresh()->horometro_base);
        $item = $this->withToken($token)->getJson('/api/vehiculos?q=TR-015')
            ->assertOk()->json('data.0');
        $this->assertTrue($item['tiene_horometro_base']);
        $this->assertEquals(2500, $item['ultimo_horometro_valido']);
    }

    public function test_zero_base_is_treated_as_without_reference(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $vehicle = Vehiculo::where('codigo', 'TR-015')->firstOrFail();
        $vehicle->update(['horometro_base' => 0]);

        $item = $this->withToken($token)->getJson('/api/vehiculos?q=TR-015')
            ->assertOk()->json('data.0');
        $this->assertFalse($item['tiene_horometro_base']);
        $this->assertNull($item['ultimo_horometro_valido']);

        $this->withToken($token)->postJson('/api/horometros/inicio', [
            'vehiculo_id' => $vehicle->id,
            'fecha' => '2026-09-01',
            'fecha_hora_inicio' => '2026-09-01 07:30:00',
            'horometro_inicial_confirmado' => 2500,
            'foto_inicial' => 'evidence.jpg',
        ])->assertCreated();

        $this->assertSame('2500.00', $vehicle->refresh()->horometro_base);
    }

    public function test_heavy_machinery_start_allows_optional_photo(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $vehicle = Vehiculo::where('codigo', 'MP-001')->firstOrFail();
        $vehicle->update(['horometro_base' => null]);

        $this->withToken($token)->postJson('/api/horometros/inicio', [
            'vehiculo_id' => $vehicle->id,
            'fecha' => '2026-09-01',
            'fecha_hora_inicio' => '2026-09-01 07:30:00',
            'horometro_inicial_confirmado' => 1250,
        ])->assertCreated()
            ->assertJsonPath('data.foto_inicial', null);
    }

    public function test_closing_from_empty_zero_opening_does_not_create_inflated_hours(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $vehicle = Vehiculo::where('codigo', 'TR-015')->firstOrFail();
        $vehicle->update(['horometro_base' => 0]);

        $recordId = $this->withToken($token)->postJson('/api/horometros/inicio', [
            'vehiculo_id' => $vehicle->id,
            'fecha' => '2026-09-01',
            'fecha_hora_inicio' => '2026-09-01 07:30:00',
            'horometro_inicial_confirmado' => 0,
            'foto_inicial' => 'evidence.jpg',
        ])->assertCreated()->json('data.id');

        $this->withToken($token)->postJson("/api/horometros/{$recordId}/cierre", [
            'horometro_final_confirmado' => 2500,
            'fecha_hora_final' => '2026-09-01 07:31:00',
            'foto_final' => 'close.jpg',
        ])->assertOk()
            ->assertJsonPath('data.estado', 'COMPLETO')
            ->assertJsonPath('data.horas_trabajadas', '0.00')
            ->assertJsonPath('data.observacion', null);

        $this->assertSame('2500.00', $vehicle->refresh()->horometro_base);
    }

    public function test_retry_of_offline_start_does_not_create_a_duplicate(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $payload = [
            'client_reference' => 'offline-test-unique',
            'vehiculo_id' => Vehiculo::where('codigo', 'TR-015')->value('id'),
            'fecha' => '2026-09-01',
            'fecha_hora_inicio' => '2026-09-01 07:30:00',
            'horometro_inicial_confirmado' => 50,
            'foto_inicial' => 'evidence.jpg',
        ];
        $first = $this->withToken($token)->postJson('/api/horometros/inicio', $payload)->assertCreated();
        $this->withToken($token)->postJson('/api/horometros/inicio', $payload)
            ->assertCreated()->assertJsonPath('data.id', $first->json('data.id'));
        $this->assertSame(1, HorometroRegistro::where('client_reference', 'offline-test-unique')->count());
    }

    public function test_manual_start_uses_base_and_last_close_across_days_without_activity(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $vehicle = Vehiculo::where('codigo', 'TR-015')->firstOrFail();
        $vehicle->update(['horometro_base' => 100]);
        $payload = [
            'vehiculo_id' => $vehicle->id,
            'fecha' => '2026-09-01',
            'fecha_hora_inicio' => '2026-09-01 07:30:00',
            'foto_inicial' => 'evidence.jpg',
        ];
        foreach ([99, 101] as $value) {
            $this->withToken($token)->postJson('/api/horometros/inicio', [
                ...$payload, 'horometro_inicial_confirmado' => $value,
            ])->assertUnprocessable()->assertJsonValidationErrors('horometro_inicial_confirmado');
        }
        $id = $this->withToken($token)->postJson('/api/horometros/inicio', [
            ...$payload, 'horometro_inicial_confirmado' => 100,
        ])->assertCreated()->json('data.id');
        $this->withToken($token)->postJson("/api/horometros/{$id}/cierre", [
            'horometro_final_confirmado' => 105,
            'fecha_hora_final' => '2026-09-01 18:00:00',
            'foto_final' => 'close.jpg',
        ])->assertOk();
        $this->withToken($token)->postJson('/api/horometros/inicio', [
            ...$payload, 'fecha' => '2026-09-04',
            'fecha_hora_inicio' => '2026-09-04 07:30:00',
            'horometro_inicial_confirmado' => 105,
        ])->assertCreated();
    }

    public function test_tolerance_never_allows_reading_below_reference(): void
    {
        $this->seed(DatabaseSeeder::class);
        $vehicle = Vehiculo::where('codigo', 'TR-015')->firstOrFail();
        $vehicle->update(['horometro_base' => 100]);
        HorometroConfiguracion::query()->firstOrFail()->update(['tolerancia_inicio_horas' => 1]);
        $this->withToken($this->adminToken())->postJson('/api/horometros/inicio', [
            'vehiculo_id' => $vehicle->id,
            'fecha' => '2026-09-01',
            'fecha_hora_inicio' => '2026-09-01 07:30:00',
            'foto_inicial' => 'evidence.jpg',
            'horometro_inicial_confirmado' => 99.5,
        ])->assertUnprocessable()->assertJsonValidationErrors('horometro_inicial_confirmado');
    }

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

    public function test_empty_daily_record_can_be_completed_as_start(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $vehicle = Vehiculo::where('codigo', 'TR-015')->firstOrFail();
        $vehicle->update(['horometro_base' => null]);

        $record = HorometroRegistro::query()->create([
            'vehiculo_id' => $vehicle->id,
            'fecha' => '2026-08-27',
            'estado' => 'PENDIENTE_INICIO',
        ]);

        $this
            ->withToken($token)
            ->postJson('/api/horometros/inicio', [
                'vehiculo_id' => $vehicle->id,
                'fecha' => '2026-08-27',
                'horometro_inicial_confirmado' => 2500,
                'foto_inicial' => 'inicio.jpg',
                'fecha_hora_inicio' => '2026-08-27 07:10:00',
            ])
            ->assertCreated()
            ->assertJsonPath('data.id', $record->id)
            ->assertJsonPath('data.estado', 'EN_JORNADA');
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

    public function test_records_export_generates_xlsx_with_active_filters(): void
    {
        $this->seed(DatabaseSeeder::class);
        $matching = $this->registroEnJornada('2026-08-26', 700);
        $matching->update(['estado' => 'OBSERVADO', 'observacion' => 'Revision operativa']);
        $this->registroEnJornada('2026-08-27', 800);

        $response = $this
            ->withToken($this->adminToken())
            ->get('/api/horometros/registros/export?estado=OBSERVADO');

        $response->assertOk();
        $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $path = tempnam(sys_get_temp_dir(), 'hor_export_');
        file_put_contents($path, $response->streamedContent());

        $zip = new ZipArchive;
        $this->assertTrue($zip->open($path));
        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        unlink($path);

        $this->assertIsString($sheet);
        $this->assertStringContainsString('Revision operativa', $sheet);
        $this->assertStringContainsString('OBSERVADO', $sheet);
        $this->assertStringNotContainsString('800', $sheet);
    }

    public function test_hourmeter_records_are_marked_with_iso_week(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $vehicle = Vehiculo::where('codigo', 'TR-015')->firstOrFail();
        $vehicle->update(['horometro_base' => null]);

        $recordId = $this
            ->withToken($token)
            ->postJson('/api/horometros/inicio', [
                'vehiculo_id' => $vehicle->id,
                'fecha' => '2026-09-07',
                'fecha_hora_inicio' => '2026-09-07 07:30:00',
                'horometro_inicial_confirmado' => 2500,
                'foto_inicial' => 'evidence.jpg',
            ])
            ->assertCreated()
            ->json('data.id');

        $this->assertDatabaseHas('horometro_registros', [
            'id' => $recordId,
            'semana_iso' => 37,
            'semana_anio' => 2026,
        ]);
    }

    public function test_sap_export_generates_measurement_rows(): void
    {
        $this->seed(DatabaseSeeder::class);
        $sede = Sede::query()->firstOrFail();
        $sede->update(['codigo' => '1503']);
        $vehicle = Vehiculo::where('codigo', 'TR-015')->firstOrFail();
        $vehicle->update([
            'codigo' => 'C-61',
            'placa' => 'C-61',
            'sede_id' => $sede->id,
            'punto_medida' => '1139',
        ]);

        HorometroRegistro::query()->create([
            'vehiculo_id' => $vehicle->id,
            'fecha' => '2026-09-07',
            'punto_medida' => '1139',
            'horometro_inicial_confirmado' => 100,
            'foto_inicial' => 'inicio.jpg',
            'fecha_hora_inicio' => '2026-09-07 07:15:00',
            'horometro_final_confirmado' => 108,
            'foto_final' => 'final.jpg',
            'fecha_hora_final' => '2026-09-07 18:10:00',
            'horas_trabajadas' => 8,
            'estado' => 'COMPLETO',
        ]);

        $response = $this
            ->withToken($this->adminToken())
            ->get('/api/horometros/registros/exportable-sap?semana_anio=2026&semana_iso=37');

        $response->assertOk();
        $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $path = tempnam(sys_get_temp_dir(), 'sap_export_');
        file_put_contents($path, $response->streamedContent());

        $zip = new ZipArchive;
        $this->assertTrue($zip->open($path));
        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        unlink($path);

        $this->assertIsString($sheet);
        $this->assertStringContainsString('Equipo ComP.', $sheet);
        $this->assertStringContainsString('Centro Planificacion', $sheet);
        $this->assertStringContainsString('C-61', $sheet);
        $this->assertStringContainsString('1139', $sheet);
        $this->assertStringContainsString('SEM 37 1503 792026', $sheet);
        $this->assertStringContainsString('108', $sheet);
    }

    public function test_sap_report_api_requires_bearer_token_and_returns_rows(): void
    {
        config(['services.horometros_sap_report.token' => 'sap-token-test']);
        $this->seed(DatabaseSeeder::class);
        $sede = Sede::query()->firstOrFail();
        $sede->update(['codigo' => '1503']);
        $vehicle = Vehiculo::where('codigo', 'TR-015')->firstOrFail();
        $vehicle->update([
            'codigo' => 'C-61',
            'placa' => 'C-61',
            'sede_id' => $sede->id,
            'punto_medida' => '1139',
        ]);
        HorometroRegistro::query()->create([
            'vehiculo_id' => $vehicle->id,
            'fecha' => '2026-09-07',
            'punto_medida' => '1139',
            'horometro_inicial_confirmado' => 100,
            'foto_inicial' => 'inicio.jpg',
            'fecha_hora_inicio' => '2026-09-07 07:15:00',
            'estado' => 'EN_JORNADA',
        ]);

        $this
            ->getJson('/api/integraciones/horometros/exportable-sap?fecha=2026-09-07')
            ->assertUnauthorized();

        $row = $this
            ->withHeader('Authorization', 'Bearer sap-token-test')
            ->getJson('/api/integraciones/horometros/exportable-sap?fecha=2026-09-07')
            ->assertOk()
            ->json('data.0');

        $this->assertSame('C-61', $row['Equipo ComP.']);
        $this->assertSame('1503', $row['Centro Planificacion']);
        $this->assertSame('1139', $row['Punto de Medida']);
        $this->assertSame('H', $row['UM Entrada de Documento']);
        $this->assertSame('07/09/2026', $row['Fecha de Medición']);
        $this->assertSame('07:15:00', $row['Hora de Medición']);
        $this->assertSame('C-61 SEM 37 1503 792026', $row['texto Medicion']);
    }

    public function test_only_admin_can_delete_hourmeter_records(): void
    {
        config(['filesystems.evidence_disk' => 'public']);
        Storage::fake('public');
        $this->seed(DatabaseSeeder::class);
        $record = $this->registroEnJornada('2026-08-26', 700);
        $record->update([
            'foto_inicial' => 'horometros/2026/08/26/inicio.jpg',
            'foto_final' => 'horometros/2026/08/26/final.jpg',
        ]);
        Storage::disk('public')->put($record->foto_inicial, 'inicio');
        Storage::disk('public')->put($record->foto_final, 'final');

        $this
            ->withToken($this->adminToken())
            ->deleteJson("/api/horometros/registros/{$record->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing(HorometroRegistro::class, ['id' => $record->id]);
        Storage::disk('public')->assertMissing('horometros/2026/08/26/inicio.jpg');
        Storage::disk('public')->assertMissing('horometros/2026/08/26/final.jpg');
    }

    public function test_non_admin_cannot_delete_hourmeter_records(): void
    {
        $this->seed(DatabaseSeeder::class);
        $record = $this->registroEnJornada('2026-08-26', 700);
        $user = User::factory()->create([
            'email' => 'supervisor.horometros@agrocontrol.local',
            'username' => 'supervisor.horometros',
        ]);
        $user->assignRole('SUPERVISOR_HOROMETROS');

        $this
            ->withToken($user->createToken('feature-test')->plainTextToken)
            ->deleteJson("/api/horometros/registros/{$record->id}")
            ->assertForbidden();

        $this->assertDatabaseHas(HorometroRegistro::class, ['id' => $record->id]);
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

    public function test_app_user_login_and_sync_only_return_allowed_type_data(): void
    {
        $this->seed(DatabaseSeeder::class);

        $tractorType = TipoVehiculo::where('nombre', 'Tractor')->firstOrFail();
        $machineryType = TipoVehiculo::where('nombre', 'Maquinaria Pesada')->firstOrFail();
        $personal = Personal::query()->create([
            'dni' => '76543210',
            'nombres' => 'Jose',
            'apellidos' => 'Tractorista',
            'tipo' => 'TRACTORISTA',
            'estado' => 'ACTIVO',
        ]);
        $appUser = UsuarioAplicativo::query()->create([
            'personal_id' => $personal->id,
            'nombre' => 'Jose Tractorista',
            'usuario' => '76543210',
            'password' => Hash::make('76543210'),
            'estado' => 'ACTIVO',
        ]);
        $appUser->tiposVehiculo()->sync([$tractorType->id]);

        HorometroRegistro::query()->create([
            'vehiculo_id' => Vehiculo::where('tipo_vehiculo_id', $tractorType->id)->value('id'),
            'operario_id' => $personal->id,
            'usuario_aplicativo_id' => $appUser->id,
            'fecha' => '2026-09-08',
            'horometro_inicial_confirmado' => 100,
            'fecha_hora_inicio' => '2026-09-08 07:20:00',
            'estado' => 'EN_JORNADA',
        ]);
        HorometroRegistro::query()->create([
            'vehiculo_id' => Vehiculo::where('tipo_vehiculo_id', $machineryType->id)->value('id'),
            'fecha' => '2026-09-08',
            'horometro_inicial_confirmado' => 200,
            'fecha_hora_inicio' => '2026-09-08 07:25:00',
            'estado' => 'EN_JORNADA',
        ]);

        $login = $this->postJson('/api/app/horometros/login', [
            'usuario' => '76543210',
            'password' => '76543210',
        ])->assertOk()
            ->assertJsonPath('user.usuario', '76543210')
            ->assertJsonCount(1, 'tipos_registro');

        $token = $login->json('token');
        $sync = $this->withToken($token)->getJson('/api/app/horometros/sync')->assertOk();

        $this->assertContains($tractorType->id, collect($sync->json('data.tipos_registro'))->pluck('id')->all());
        $this->assertNotContains($machineryType->id, collect($sync->json('data.tipos_registro'))->pluck('id')->all());
        $this->assertTrue(collect($sync->json('data.vehiculos'))->every(fn (array $item) => $item['tipo_vehiculo_id'] === $tractorType->id));
        $this->assertTrue(collect($sync->json('data.pendientes'))->every(fn (array $item) => $item['usuario_aplicativo_id'] === $appUser->id));
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
