<?php

namespace Tests\Feature;

use App\Models\Gerencia;
use App\Models\HorometroReapertura;
use App\Models\HorometroRegistro;
use App\Models\OrdenTrabajo;
use App\Models\Personal;
use App\Models\Sede;
use App\Models\TipoFalla;
use App\Models\TipoPersonal;
use App\Models\TipoVehiculo;
use App\Models\User;
use App\Models\Vehiculo;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use ZipArchive;

class MaestrosApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_maestros_endpoints_require_authentication(): void
    {
        $this
            ->getJson('/api/gerencias')
            ->assertUnauthorized();
    }

    public function test_admin_can_list_paginated_gerencias(): void
    {
        $this->seed(DatabaseSeeder::class);

        $response = $this
            ->withToken($this->adminToken())
            ->getJson('/api/gerencias?per_page=2');

        $response
            ->assertOk()
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.total', 5)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'codigo', 'nombre', 'estado'],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);
    }

    public function test_admin_can_create_and_update_gerencia(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();

        $created = $this
            ->withToken($token)
            ->postJson('/api/gerencias', [
                'codigo' => 'AGR',
                'nombre' => 'Agrícola',
                'estado' => 'ACTIVO',
            ]);

        $created
            ->assertCreated()
            ->assertJsonPath('data.codigo', 'AGR');

        $gerenciaId = $created->json('data.id');

        $this
            ->withToken($token)
            ->putJson("/api/gerencias/{$gerenciaId}", [
                'codigo' => 'AGR',
                'nombre' => 'Agrícola Operaciones',
                'estado' => 'ACTIVO',
            ])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Agrícola Operaciones');
    }

    public function test_admin_can_filter_vehiculos_by_sede_and_estado(): void
    {
        $this->seed(DatabaseSeeder::class);

        $sedeId = Sede::where('codigo', 'LOCAL')->value('id');

        $response = $this
            ->withToken($this->adminToken())
            ->getJson("/api/vehiculos?sede_id={$sedeId}&estado=OPERATIVO");

        $response
            ->assertOk()
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('data.0.gerencia', null)
            ->assertJsonPath('data.0.sede.codigo', 'LOCAL');
    }

    public function test_admin_can_view_vehicle_traceability_summary(): void
    {
        $this->seed(DatabaseSeeder::class);

        $vehiculo = Vehiculo::where('codigo', 'TR-015')->firstOrFail();

        HorometroRegistro::query()->create([
            'vehiculo_id' => $vehiculo->id,
            'fecha' => '2026-08-26',
            'horometro_inicial_confirmado' => 120,
            'foto_inicial' => 'inicio.jpg',
            'fecha_hora_inicio' => '2026-08-26 07:20:00',
            'horometro_final_confirmado' => 128,
            'foto_final' => 'final.jpg',
            'fecha_hora_final' => '2026-08-26 18:00:00',
            'horas_trabajadas' => 8,
            'estado' => 'COMPLETO',
        ]);

        OrdenTrabajo::query()->create([
            'numero_ot' => 'OT-2026-000555',
            'vehiculo_id' => $vehiculo->id,
            'gerencia_id' => Gerencia::where('codigo', 'GEN')->value('id'),
            'tipo_falla_id' => TipoFalla::where('nombre', 'Motor')->value('id'),
            'detalle_reporte' => 'Revisión preventiva por horas acumuladas.',
            'estado' => 'PENDIENTE',
            'estado_equipo' => 'OPERATIVO_CON_PENDIENTE',
            'fecha_reporte' => now(),
        ]);

        $this
            ->withToken($this->adminToken())
            ->getJson("/api/vehiculos/{$vehiculo->id}/trazabilidad")
            ->assertOk()
            ->assertJsonPath('data.vehiculo.codigo', 'TR-015')
            ->assertJsonPath('data.metricas.horas_totales', 8)
            ->assertJsonPath('data.metricas.ordenes_abiertas', 1)
            ->assertJsonPath('data.ordenes_recientes.0.numero_ot', 'OT-2026-000555')
            ->assertJsonPath('data.registros_recientes.0.estado', 'COMPLETO');
    }

    public function test_admin_can_create_personal_and_user_with_role(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();

        $sedeId = Sede::where('codigo', 'LOCAL')->value('id');
        $gerenciaId = Gerencia::where('codigo', 'GEN')->value('id');

        $this
            ->withToken($token)
            ->postJson('/api/personal', [
                'dni' => '76543210',
                'nombres' => 'Rosa',
                'apellidos' => 'Campos',
                'tipo' => 'TECNICO',
                'gerencia_id' => $gerenciaId,
                'sede_id' => $sedeId,
                'estado' => 'ACTIVO',
            ])
            ->assertCreated()
            ->assertJsonPath('data.tipo', 'TECNICO');

        $this
            ->withToken($token)
            ->postJson('/api/usuarios', [
                'name' => 'Rosa',
                'last_name' => 'Campos',
                'dni' => '76543210',
                'username' => 'rosa.campos',
                'email' => 'rosa.campos@agrocontrol.local',
                'password' => 'admin123',
                'status' => 'ACTIVO',
                'roles' => ['TECNICO_TALLER'],
            ])
            ->assertCreated()
            ->assertJsonMissing(['password' => 'admin123'])
            ->assertJsonPath('data.roles.0.name', 'TECNICO_TALLER');
    }

    public function test_admin_can_manage_personal_types_and_use_them_in_personal(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();

        $created = $this
            ->withToken($token)
            ->postJson('/api/tipos-personal', [
                'codigo' => 'SUPERVISOR',
                'nombre' => 'Supervisor',
                'estado' => 'ACTIVO',
            ])
            ->assertCreated()
            ->assertJsonPath('data.codigo', 'SUPERVISOR')
            ->json('data');

        $this
            ->withToken($token)
            ->putJson("/api/tipos-personal/{$created['id']}", [
                'codigo' => 'SUPERVISOR',
                'nombre' => 'Supervisor de Campo',
                'estado' => 'ACTIVO',
            ])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Supervisor de Campo');

        $this
            ->withToken($token)
            ->getJson('/api/tipos-personal?q=supervisor')
            ->assertOk()
            ->assertJsonPath('data.0.codigo', 'SUPERVISOR');

        $this
            ->withToken($token)
            ->postJson('/api/personal', [
                'dni' => '45678901',
                'nombres' => 'Carlos',
                'apellidos' => 'Diaz',
                'tipo' => 'SUPERVISOR',
                'gerencia_id' => null,
                'sede_id' => null,
                'estado' => 'ACTIVO',
            ])
            ->assertCreated()
            ->assertJsonPath('data.tipo', 'SUPERVISOR');

        $this->assertDatabaseHas(TipoPersonal::class, [
            'codigo' => 'SUPERVISOR',
            'nombre' => 'Supervisor de Campo',
        ]);
    }

    public function test_admin_can_bulk_import_vehicles_and_vehicle_types(): void
    {
        $this->seed(DatabaseSeeder::class);
        $sedeId = Sede::where('codigo', 'LOCAL')->value('id');
        $sede = Sede::findOrFail($sedeId);

        $this
            ->withToken($this->adminToken())
            ->postJson('/api/importaciones/vehiculos', [
                'rows' => [
                    [
                        'codigo' => 'tr-900',
                        'tipo_vehiculo' => 'Tractor',
                        'nombre' => 'Tractor 900',
                        'marca' => 'CAT',
                        'modelo' => 'D6',
                        'punto_medida' => 'PM-TR-900',
                        'punto_medida_vigente_desde' => '2026-09-08',
                        'sede' => "{$sede->codigo} - {$sede->nombre}",
                        'horometro_base' => 15.5,
                    ],
                    [
                        'codigo' => 'mp-900',
                        'tipo_vehiculo' => 'Maquinaria Pesada',
                        'nombre' => 'Excavadora 900',
                        'marca' => 'CAT',
                        'modelo' => '320D',
                        'punto_medida' => 'PM-MP-900',
                        'punto_medida_vigente_desde' => '2026-09-09',
                        'sede' => $sede->codigo,
                        'horometro_base' => 40,
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.tipos_creados', 0)
            ->assertJsonPath('data.tipos_actualizados', 2)
            ->assertJsonPath('data.vehiculos_creados', 2);

        $tractorTipoId = TipoVehiculo::where('nombre', 'Tractor')->value('id');
        $maquinariaTipoId = TipoVehiculo::where('nombre', 'Maquinaria Pesada')->value('id');

        $this->assertNotNull($tractorTipoId);
        $this->assertNotNull($maquinariaTipoId);
        $this->assertDatabaseHas(Vehiculo::class, [
            'codigo' => 'TR-900',
            'tipo_vehiculo_id' => $tractorTipoId,
            'nombre' => 'Tractor 900',
            'gerencia_id' => null,
            'sede_id' => $sedeId,
            'fundo_id' => null,
            'sector_id' => null,
            'lote_id' => null,
            'punto_medida' => 'PM-TR-900',
            'punto_medida_vigente_desde' => '2026-09-08 00:00:00',
            'estado' => 'OPERATIVO',
            'activo' => true,
        ]);
        $this->assertDatabaseHas(Vehiculo::class, [
            'codigo' => 'MP-900',
            'tipo_vehiculo_id' => $maquinariaTipoId,
            'nombre' => 'Excavadora 900',
            'gerencia_id' => null,
            'sede_id' => $sedeId,
            'fundo_id' => null,
            'sector_id' => null,
            'lote_id' => null,
            'punto_medida' => 'PM-MP-900',
            'punto_medida_vigente_desde' => '2026-09-09 00:00:00',
            'estado' => 'OPERATIVO',
            'activo' => true,
        ]);
        $this->assertDatabaseHas(TipoVehiculo::class, [
            'nombre' => 'Tractor',
            'requiere_horometro' => true,
            'requiere_login_horometro' => false,
            'estado' => 'ACTIVO',
        ]);
        $this->assertDatabaseHas(TipoVehiculo::class, [
            'nombre' => 'Maquinaria Pesada',
            'requiere_horometro' => true,
            'requiere_login_horometro' => true,
            'estado' => 'ACTIVO',
        ]);
    }

    public function test_admin_can_create_update_and_delete_vehicle_with_measurement_point(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();

        $created = $this
            ->withToken($token)
            ->postJson('/api/vehiculos', [
                'codigo' => 'TR-777',
                'nombre' => 'Tractor 777',
                'tipo_vehiculo_id' => TipoVehiculo::where('nombre', 'Tractor')->value('id'),
                'sede_id' => Sede::where('codigo', 'LOCAL')->value('id'),
                'punto_medida' => 'PM-TR-777',
                'punto_medida_vigente_desde' => '2026-09-08',
                'horometro_base' => 0,
            ]);

        $created
            ->assertCreated()
            ->assertJsonPath('data.punto_medida', 'PM-TR-777')
            ->assertJsonPath('data.punto_medida_vigente_desde', '2026-09-08T05:00:00.000000Z');

        $vehicleId = $created->json('data.id');

        $this
            ->withToken($token)
            ->putJson("/api/vehiculos/{$vehicleId}", [
                'codigo' => 'TR-777',
                'nombre' => 'Tractor 777',
                'tipo_vehiculo_id' => TipoVehiculo::where('nombre', 'Tractor')->value('id'),
                'sede_id' => Sede::where('codigo', 'LOCAL')->value('id'),
                'punto_medida' => 'PM-TR-777-B',
                'punto_medida_vigente_desde' => '2026-10-01',
                'horometro_base' => 0,
                'estado' => 'OPERATIVO',
                'activo' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.punto_medida', 'PM-TR-777-B');

        $this
            ->withToken($token)
            ->deleteJson("/api/vehiculos/{$vehicleId}")
            ->assertNoContent();

        $this->assertDatabaseMissing(Vehiculo::class, [
            'codigo' => 'TR-777',
        ]);
    }

    public function test_admin_can_bulk_delete_selected_vehicles(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();

        $sedeId = Sede::where('codigo', 'LOCAL')->value('id');
        $tipoId = TipoVehiculo::where('nombre', 'Tractor')->value('id');
        $vehiculoA = Vehiculo::query()->create([
            'codigo' => 'TR-801',
            'nombre' => 'Tractor 801',
            'tipo_vehiculo_id' => $tipoId,
            'sede_id' => $sedeId,
            'estado' => 'OPERATIVO',
            'activo' => true,
        ]);
        $vehiculoB = Vehiculo::query()->create([
            'codigo' => 'TR-802',
            'nombre' => 'Tractor 802',
            'tipo_vehiculo_id' => $tipoId,
            'sede_id' => $sedeId,
            'estado' => 'OPERATIVO',
            'activo' => true,
        ]);

        $this
            ->withToken($token)
            ->deleteJson('/api/vehiculos', [
                'ids' => [$vehiculoA->id, $vehiculoB->id],
            ])
            ->assertOk()
            ->assertJsonPath('data.eliminados', 2)
            ->assertJsonPath('data.bloqueados', []);

        $this->assertDatabaseMissing(Vehiculo::class, ['codigo' => 'TR-801']);
        $this->assertDatabaseMissing(Vehiculo::class, ['codigo' => 'TR-802']);
    }

    public function test_non_admin_cannot_delete_vehicle(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::factory()->create([
            'username' => 'editor.maestros',
            'email' => 'editor.maestros@agrocontrol.local',
        ]);
        $user->givePermissionTo('maestros.editar');

        $vehiculo = Vehiculo::where('codigo', 'TR-015')->firstOrFail();

        $this
            ->withToken($user->createToken('feature-test')->plainTextToken)
            ->deleteJson("/api/vehiculos/{$vehiculo->id}")
            ->assertForbidden();
    }

    public function test_admin_cannot_delete_vehicle_with_dependencies(): void
    {
        $this->seed(DatabaseSeeder::class);

        $vehiculo = Vehiculo::where('codigo', 'TR-015')->firstOrFail();

        HorometroReapertura::query()->create([
            'vehiculo_id' => $vehiculo->id,
            'fecha' => '2026-09-08',
            'tipo_registro' => 'INICIO',
            'usuario_id' => User::where('email', 'admin@agrocontrol.local')->value('id'),
            'fecha_hora' => '2026-09-08 10:00:00',
            'estado_posterior' => 'APERTURADO',
            'motivo' => 'Prueba',
        ]);

        $this
            ->withToken($this->adminToken())
            ->deleteJson("/api/vehiculos/{$vehiculo->id}")
            ->assertStatus(409)
            ->assertJsonPath('code', 'VEHICLE_HAS_DEPENDENCIES');
    }

    public function test_hourmeter_records_use_measurement_point_by_effective_date(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();

        $vehiculo = Vehiculo::where('codigo', 'TR-015')->firstOrFail();

        $this
            ->withToken($token)
            ->putJson("/api/vehiculos/{$vehiculo->id}", [
                'codigo' => $vehiculo->codigo,
                'nombre' => $vehiculo->nombre,
                'tipo_vehiculo_id' => $vehiculo->tipo_vehiculo_id,
                'sede_id' => $vehiculo->sede_id,
                'punto_medida' => '1139',
                'punto_medida_vigente_desde' => '2026-09-01',
                'horometro_base' => null,
                'estado' => 'OPERATIVO',
                'activo' => true,
            ])
            ->assertOk();

        $this
            ->withToken($token)
            ->putJson("/api/vehiculos/{$vehiculo->id}", [
                'codigo' => $vehiculo->codigo,
                'nombre' => $vehiculo->nombre,
                'tipo_vehiculo_id' => $vehiculo->tipo_vehiculo_id,
                'sede_id' => $vehiculo->sede_id,
                'punto_medida' => '1140',
                'punto_medida_vigente_desde' => '2026-09-15',
                'horometro_base' => null,
                'estado' => 'OPERATIVO',
                'activo' => true,
            ])
            ->assertOk();

        $this
            ->withToken($token)
            ->postJson('/api/horometros/inicio', [
                'vehiculo_id' => $vehiculo->id,
                'fecha' => '2026-09-14',
                'fecha_hora_inicio' => '2026-09-14 07:30:00',
                'horometro_inicial_confirmado' => 100,
                'foto_inicial' => 'inicio-14.jpg',
            ])
            ->assertCreated()
            ->assertJsonPath('data.punto_medida', '1139');

        $registro = HorometroRegistro::where('vehiculo_id', $vehiculo->id)
            ->whereDate('fecha', '2026-09-14')
            ->firstOrFail();

        $this
            ->withToken($token)
            ->postJson("/api/horometros/{$registro->id}/cierre", [
                'fecha_hora_final' => '2026-09-14 18:00:00',
                'horometro_final_confirmado' => 100,
                'foto_final' => 'final-14.jpg',
            ])
            ->assertOk();

        $this
            ->withToken($token)
            ->postJson('/api/horometros/inicio', [
                'vehiculo_id' => $vehiculo->id,
                'fecha' => '2026-09-15',
                'fecha_hora_inicio' => '2026-09-15 07:30:00',
                'horometro_inicial_confirmado' => 100,
                'foto_inicial' => 'inicio-15.jpg',
            ])
            ->assertCreated()
            ->assertJsonPath('data.punto_medida', '1140');

        $this
            ->withToken($token)
            ->getJson("/api/vehiculos/{$vehiculo->id}/puntos-medida")
            ->assertOk()
            ->assertJsonPath('data.total_cambios', 1)
            ->assertJsonPath('data.historial.0.punto_medida', '1140')
            ->assertJsonPath('data.historial.1.punto_medida', '1139');
    }

    public function test_admin_can_download_personal_import_template(): void
    {
        $this->seed(DatabaseSeeder::class);

        $response = $this
            ->withToken($this->adminToken())
            ->get('/api/importaciones/personal/plantilla');

        $response
            ->assertOk()
            ->assertHeader('content-disposition');

        $path = tempnam(sys_get_temp_dir(), 'personal_template_');
        file_put_contents($path, $response->streamedContent());

        $zip = new ZipArchive;

        $this->assertTrue($zip->open($path));
        $this->assertNotFalse($zip->locateName('xl/worksheets/sheet1.xml'));
        $this->assertNotFalse($zip->locateName('xl/worksheets/sheet2.xml'));
        $this->assertStringContainsString('dataValidation', $zip->getFromName('xl/worksheets/sheet1.xml'));
        $styles = $zip->getFromName('xl/styles.xml');
        $this->assertStringContainsString('<fills count="3">', $styles);
        $this->assertStringContainsString('FF1D4ED8', $styles);
        $this->assertStringContainsString('fontId="1" fillId="2"', $styles);

        $zip->close();
        unlink($path);
    }

    public function test_vehicle_import_template_has_measurement_point_and_blue_header(): void
    {
        $this->seed(DatabaseSeeder::class);

        $response = $this
            ->withToken($this->adminToken())
            ->get('/api/importaciones/vehiculos/plantilla');

        $response->assertOk();

        $path = tempnam(sys_get_temp_dir(), 'vehicle_template_');
        file_put_contents($path, $response->streamedContent());

        $zip = new ZipArchive;

        $this->assertTrue($zip->open($path));
        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');

        $this->assertStringContainsString('punto_medida', $sheet);
        $this->assertStringContainsString('punto_medida_vigente_desde', $sheet);
        $styles = $zip->getFromName('xl/styles.xml');
        $this->assertStringContainsString('<fills count="3">', $styles);
        $this->assertStringContainsString('FF1D4ED8', $styles);
        $this->assertStringContainsString('fontId="1" fillId="2"', $styles);

        $zip->close();
        unlink($path);
    }

    public function test_admin_can_bulk_import_personal(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this
            ->withToken($this->adminToken())
            ->postJson('/api/importaciones/personal', [
                'rows' => [
                    [
                        'dni' => '87654321',
                        'nombres' => 'Luis',
                        'apellidos' => 'Quispe',
                        'tipo' => 'OPERARIO',
                        'gerencia' => 'GEN - General',
                        'sede' => 'LOCAL - Sede local',
                        'estado' => 'ACTIVO',
                    ],
                    [
                        'dni' => '12345678',
                        'nombres' => 'Ana',
                        'apellidos' => 'Torres',
                        'tipo' => 'TECNICO',
                        'gerencia' => 'GEN',
                        'sede' => 'LOCAL',
                        'estado' => 'INACTIVO',
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.personal_creado', 2)
            ->assertJsonPath('data.personal_actualizado', 0);

        $this->assertDatabaseHas(Personal::class, [
            'dni' => '87654321',
            'nombres' => 'Luis',
            'apellidos' => 'Quispe',
            'tipo' => 'OPERARIO',
            'estado' => 'ACTIVO',
        ]);
        $this->assertDatabaseHas(Personal::class, [
            'dni' => '12345678',
            'nombres' => 'Ana',
            'apellidos' => 'Torres',
            'tipo' => 'TECNICO',
            'estado' => 'INACTIVO',
        ]);

        $this
            ->withToken($this->adminToken())
            ->postJson('/api/importaciones/personal', [
                'rows' => [
                    [
                        'dni' => '87654321',
                        'nombres' => 'Luis Alberto',
                        'apellidos' => 'Quispe',
                        'tipo' => 'CONDUCTOR',
                        'gerencia' => 'General',
                        'sede' => 'Sede local',
                        'estado' => 'ACTIVO',
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.personal_creado', 0)
            ->assertJsonPath('data.personal_actualizado', 1);

        $this->assertDatabaseHas(Personal::class, [
            'dni' => '87654321',
            'nombres' => 'Luis Alberto',
            'tipo' => 'CONDUCTOR',
        ]);
    }

    public function test_validation_errors_use_standard_api_shape(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this
            ->withToken($this->adminToken())
            ->postJson('/api/tipos-vehiculo', [
                'nombre' => '',
                'requiere_horometro' => true,
                'requiere_login_horometro' => false,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'VALIDATION_ERROR')
            ->assertJsonValidationErrors(['nombre']);
    }

    public function test_user_without_create_permission_cannot_create_catalogs(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::factory()->create([
            'email' => 'lector@agrocontrol.local',
        ]);
        $user->givePermissionTo('maestros.ver');

        $this
            ->withToken($user->createToken('feature-test')->plainTextToken)
            ->postJson('/api/gerencias', [
                'codigo' => 'NOPE',
                'nombre' => 'Sin permiso',
                'estado' => 'ACTIVO',
            ])
            ->assertForbidden();
    }

    public function test_admin_can_create_role_and_list_permissions(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();

        $this
            ->withToken($token)
            ->getJson('/api/permisos')
            ->assertOk()
            ->assertJsonPath('meta.total', 21);

        $this
            ->withToken($token)
            ->postJson('/api/roles', [
                'name' => 'LECTOR_MAESTROS',
                'permissions' => ['maestros.ver'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'LECTOR_MAESTROS')
            ->assertJsonPath('data.permissions.0.name', 'maestros.ver');
    }

    private function adminToken(): string
    {
        $admin = User::where('email', 'admin@agrocontrol.local')->firstOrFail();

        return $admin->createToken('feature-test')->plainTextToken;
    }
}
