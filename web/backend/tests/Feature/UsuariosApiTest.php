<?php

namespace Tests\Feature;

use App\Models\User;
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

    private function adminToken(): string
    {
        return User::where('email', 'admin@agrocontrol.local')
            ->firstOrFail()
            ->createToken('feature-test')
            ->plainTextToken;
    }
}
