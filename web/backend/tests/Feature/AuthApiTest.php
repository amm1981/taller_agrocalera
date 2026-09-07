<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_and_receive_roles_permissions_and_token(): void
    {
        $this->seed(DatabaseSeeder::class);

        $response = $this->postJson('/api/auth/login', [
            'usuario' => 'admin',
            'password' => 'admin123',
            'device_name' => 'feature-test',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.username', 'admin')
            ->assertJsonPath('user.email', 'admin@agrocontrol.local')
            ->assertJsonPath('roles.0', 'ADMINISTRADOR')
            ->assertJsonFragment(['usuarios.permisos']);

        $this->assertNotEmpty($response->json('token'));
        $this->assertSame(1, PersonalAccessToken::count());
    }

    public function test_user_cannot_login_with_invalid_credentials(): void
    {
        $this->seed(DatabaseSeeder::class);

        $response = $this->postJson('/api/auth/login', [
            'usuario' => 'admin',
            'password' => 'wrong-password',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('code', 'INVALID_CREDENTIALS');
    }

    public function test_user_can_still_login_with_email_for_compatibility(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->postJson('/api/auth/login', [
            'email' => 'admin@agrocontrol.local',
            'password' => 'admin123',
        ])
            ->assertOk()
            ->assertJsonPath('user.username', 'admin');
    }

    public function test_authenticated_user_can_get_profile_roles_and_permissions(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->loginToken();

        $response = $this
            ->withToken($token)
            ->getJson('/api/auth/me');

        $response
            ->assertOk()
            ->assertJsonPath('user.email', 'admin@agrocontrol.local')
            ->assertJsonPath('roles.0', 'ADMINISTRADOR')
            ->assertJsonFragment(['maestros.ver']);
    }

    public function test_logout_revokes_current_access_token(): void
    {
        $this->seed(DatabaseSeeder::class);
        $token = $this->loginToken();

        $this
            ->withToken($token)
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Sesión cerrada correctamente.');

        $this->assertSame(0, PersonalAccessToken::count());
        $this->app['auth']->forgetGuards();

        $this
            ->withToken($token)
            ->getJson('/api/auth/me')
            ->assertUnauthorized();
    }

    private function loginToken(): string
    {
        $user = User::where('email', 'admin@agrocontrol.local')->firstOrFail();

        return $user->createToken('feature-test')->plainTextToken;
    }
}
