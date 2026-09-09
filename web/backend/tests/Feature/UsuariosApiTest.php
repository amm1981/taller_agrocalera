<?php

namespace Tests\Feature;

use App\Models\Personal;
use App\Models\TipoVehiculo;
use App\Models\User;
use App\Models\UsuarioAplicativo;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UsuariosApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_and_edit_users_with_roles(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();

        $userId = $this
            ->withToken($token)
            ->postJson('/api/usuarios', [
                'name' => 'Carlos',
                'last_name' => 'Campos',
                'dni' => '70889911',
                'username' => 'carlos.campos',
                'email' => 'carlos.campos@agrocontrol.local',
                'password' => 'admin123',
                'status' => 'ACTIVO',
                'roles' => ['USUARIO_CAMPO'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.roles.0.name', 'USUARIO_CAMPO')
            ->json('data.id');

        $this
            ->withToken($token)
            ->putJson("/api/usuarios/{$userId}", [
                'name' => 'Carlos',
                'last_name' => 'Campos Actualizado',
                'dni' => '70889911',
                'username' => 'carlos.campos',
                'email' => 'carlos.campos@agrocontrol.local',
                'password' => null,
                'status' => 'INACTIVO',
                'roles' => ['SUPERVISOR_HOROMETROS'],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'INACTIVO')
            ->assertJsonPath('data.roles.0.name', 'SUPERVISOR_HOROMETROS');

        $this->assertTrue(User::findOrFail($userId)->hasRole('SUPERVISOR_HOROMETROS'));
    }

    public function test_admin_can_create_user_without_email(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();

        $this
            ->withToken($token)
            ->postJson('/api/usuarios', [
                'name' => 'Luis',
                'last_name' => 'Quispe',
                'dni' => '87654321',
                'username' => 'luis.quispe',
                'password' => 'admin123',
                'status' => 'ACTIVO',
                'roles' => ['USUARIO_CAMPO'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.username', 'luis.quispe')
            ->assertJsonPath('data.email', 'luis.quispe@agrocontrol.local');
    }

    public function test_admin_can_update_role_permissions(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $role = Role::where('name', 'USUARIO_CAMPO')->firstOrFail();

        $this
            ->withToken($token)
            ->putJson("/api/roles/{$role->id}", [
                'name' => 'USUARIO_CAMPO',
                'permissions' => ['horometros.ver', 'horometros.registrar', 'maestros.ver'],
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'USUARIO_CAMPO')
            ->assertJsonFragment(['name' => 'horometros.registrar']);

        $this->assertTrue($role->refresh()->hasPermissionTo('horometros.registrar'));
    }

    public function test_admin_can_delete_unassigned_roles_only(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();

        $roleId = $this
            ->withToken($token)
            ->postJson('/api/roles', [
                'name' => 'ROL_TEMPORAL',
                'permissions' => ['horometros.ver'],
            ])
            ->assertCreated()
            ->json('data.id');

        $this
            ->withToken($token)
            ->deleteJson("/api/roles/{$roleId}")
            ->assertNoContent();

        $assignedRole = Role::where('name', 'USUARIO_CAMPO')->firstOrFail();
        User::factory()->create([
            'email' => 'campo.asignado@agrocontrol.local',
            'username' => 'campo.asignado',
        ])->assignRole($assignedRole);

        $this
            ->withToken($token)
            ->deleteJson("/api/roles/{$assignedRole->id}")
            ->assertUnprocessable();

        $adminRole = Role::where('name', 'ADMINISTRADOR')->firstOrFail();

        $this
            ->withToken($token)
            ->deleteJson("/api/roles/{$adminRole->id}")
            ->assertUnprocessable();
    }

    public function test_admin_can_bulk_import_app_users(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $tractor = TipoVehiculo::where('nombre', 'Tractor')->firstOrFail();
        $machinery = TipoVehiculo::where('nombre', 'Maquinaria Pesada')->firstOrFail();
        $personal = Personal::query()->create([
            'dni' => '12345678',
            'nombres' => 'Walter',
            'apellidos' => 'Maquinista',
            'tipo' => 'MAQUINISTA',
            'estado' => 'ACTIVO',
        ]);

        $this
            ->withToken($token)
            ->postJson('/api/importaciones/usuarios-aplicativo', [
                'rows' => [[
                    'dni_personal' => "{$personal->dni} - {$personal->nombres} {$personal->apellidos}",
                    'nombre' => 'Walter App',
                    'usuario' => 'walter.app',
                    'contrasena' => '12345678',
                    'tipos_registro' => "{$tractor->nombre}|{$machinery->nombre}",
                    'estado' => 'ACTIVO',
                ]],
            ])
            ->assertOk()
            ->assertJsonPath('data.usuarios_creados', 1)
            ->assertJsonPath('data.usuarios_actualizados', 0);

        $appUser = UsuarioAplicativo::where('usuario', 'walter.app')->firstOrFail();

        $this->assertSame($personal->id, $appUser->personal_id);
        $this->assertEqualsCanonicalizing(
            [$tractor->id, $machinery->id],
            $appUser->tiposVehiculo()->pluck('tipos_vehiculo.id')->all(),
        );
    }

    public function test_admin_can_manage_app_users_with_pagination_and_delete(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->adminToken();
        $tractor = TipoVehiculo::where('nombre', 'Tractor')->firstOrFail();
        $machinery = TipoVehiculo::where('nombre', 'Maquinaria Pesada')->firstOrFail();
        $personal = Personal::query()->create([
            'dni' => '21878406',
            'nombres' => 'Jose Luis',
            'apellidos' => 'Chavez Neyra',
            'tipo' => 'TRACTORISTA',
            'estado' => 'ACTIVO',
        ]);

        $appUserId = $this
            ->withToken($token)
            ->postJson('/api/usuarios-aplicativo', [
                'personal_id' => $personal->id,
                'nombre' => 'Jose Luis App',
                'usuario' => 'jose.luis',
                'password' => '21878406',
                'estado' => 'ACTIVO',
                'tipo_vehiculo_ids' => [$tractor->id],
            ])
            ->assertCreated()
            ->assertJsonPath('data.usuario', 'jose.luis')
            ->assertJsonPath('data.tipos_vehiculo.0.id', $tractor->id)
            ->json('data.id');

        $this
            ->withToken($token)
            ->getJson('/api/usuarios-aplicativo?per_page=1&page=1')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.current_page', 1);

        $this
            ->withToken($token)
            ->putJson("/api/usuarios-aplicativo/{$appUserId}", [
                'personal_id' => $personal->id,
                'nombre' => 'Jose Luis Actualizado',
                'usuario' => 'jose.luis',
                'password' => null,
                'estado' => 'INACTIVO',
                'tipo_vehiculo_ids' => [$tractor->id, $machinery->id],
            ])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Jose Luis Actualizado')
            ->assertJsonPath('data.estado', 'INACTIVO');

        $this->assertEqualsCanonicalizing(
            [$tractor->id, $machinery->id],
            UsuarioAplicativo::findOrFail($appUserId)->tiposVehiculo()->pluck('tipos_vehiculo.id')->all(),
        );

        $this
            ->withToken($token)
            ->deleteJson("/api/usuarios-aplicativo/{$appUserId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('usuarios_aplicativo', ['id' => $appUserId]);
        $this->assertDatabaseMissing('usuario_aplicativo_tipo_vehiculo', ['usuario_aplicativo_id' => $appUserId]);
    }

    private function adminToken(): string
    {
        return User::where('email', 'admin@agrocontrol.local')
            ->firstOrFail()
            ->createToken('feature-test')
            ->plainTextToken;
    }
}
