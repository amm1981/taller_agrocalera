<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'taller.ver',
            'taller.crear',
            'taller.editar',
            'taller.finalizar',
            'taller.repuestos.ver',
            'taller.repuestos.gestionar',
            'taller.backlog.ver',
            'taller.reportes.ver',
            'horometros.ver',
            'horometros.registrar',
            'horometros.reabrir',
            'horometros.validar',
            'horometros.reportes.ver',
            'maestros.ver',
            'maestros.crear',
            'maestros.editar',
            'maestros.eliminar',
            'usuarios.ver',
            'usuarios.crear',
            'usuarios.editar',
            'usuarios.permisos',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $roles = [
            'ADMINISTRADOR' => $permissions,
            'ADMINISTRATIVO_TALLER' => [
                'taller.ver',
                'taller.crear',
                'taller.editar',
                'taller.repuestos.ver',
                'taller.repuestos.gestionar',
                'taller.backlog.ver',
                'taller.reportes.ver',
                'maestros.ver',
            ],
            'SUPERVISOR_TALLER' => [
                'taller.ver',
                'taller.crear',
                'taller.editar',
                'taller.finalizar',
                'taller.repuestos.ver',
                'taller.backlog.ver',
                'taller.reportes.ver',
            ],
            'TECNICO_TALLER' => [
                'taller.ver',
                'taller.editar',
                'taller.finalizar',
                'taller.repuestos.ver',
            ],
            'SUPERVISOR_HOROMETROS' => [
                'horometros.ver',
                'horometros.registrar',
                'horometros.reabrir',
                'horometros.validar',
                'horometros.reportes.ver',
                'maestros.ver',
            ],
            'RESPONSABLE_MAQUINARIA' => [
                'horometros.ver',
                'horometros.registrar',
                'horometros.reportes.ver',
                'taller.ver',
                'maestros.ver',
            ],
            'USUARIO_CAMPO' => [
                'taller.ver',
                'taller.crear',
                'horometros.ver',
                'horometros.registrar',
                'maestros.ver',
            ],
        ];

        foreach ($roles as $roleName => $rolePermissions) {
            Role::findOrCreate($roleName, 'web')->syncPermissions($rolePermissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
