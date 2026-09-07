<?php

namespace Tests\Feature;

use App\Models\Gerencia;
use App\Models\TipoFalla;
use App\Models\TipoVehiculo;
use App\Models\User;
use App\Models\Vehiculo;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InitialDataSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_initial_catalogs_roles_permissions_and_admin_user(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(5, Gerencia::count());
        $this->assertSame(2, TipoVehiculo::count());
        $this->assertSame(6, TipoFalla::count());
        $this->assertSame(5, Vehiculo::count());
        $this->assertSame(7, Role::count());
        $this->assertSame(21, Permission::count());

        $admin = User::where('email', 'admin@agrocontrol.local')->firstOrFail();

        $this->assertTrue($admin->hasRole('ADMINISTRADOR'));
        $this->assertTrue($admin->hasPermissionTo('usuarios.permisos'));
    }
}
