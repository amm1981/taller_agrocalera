<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@agrocontrol.local'],
            [
                'name' => 'Administrador',
                'last_name' => null,
                'dni' => null,
                'username' => 'admin',
                'password' => Hash::make('admin123'),
                'status' => 'ACTIVO',
            ],
        );

        $admin->assignRole('ADMINISTRADOR');
    }
}
