<?php

namespace App\Http\Controllers\Api\Usuarios;

use App\Http\Controllers\Api\Concerns\FormatsApiPagination;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionController extends Controller
{
    use FormatsApiPagination;

    public function roles(): array
    {
        return $this->paginated(
            Role::query()
                ->with('permissions:id,name')
                ->orderBy('name')
                ->paginate($this->perPage()),
        );
    }

    public function storeRole(Request $request): JsonResponse
    {
        $data = $request->validate($this->roleRules());
        $role = Role::query()->create([
            'name' => $data['name'],
            'guard_name' => 'web',
        ]);

        $role->syncPermissions($data['permissions'] ?? []);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json(['data' => $role->load('permissions:id,name')], 201);
    }

    public function updateRole(Request $request, Role $role): JsonResponse
    {
        $data = $request->validate($this->roleRules($role->id));

        $role->update(['name' => $data['name']]);
        $role->syncPermissions($data['permissions'] ?? []);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json(['data' => $role->refresh()->load('permissions:id,name')]);
    }

    public function permissions(): array
    {
        return $this->paginated(
            Permission::query()
                ->orderBy('name')
                ->paginate($this->perPage(100)),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function roleRules(?int $ignoreId = null): array
    {
        return [
            'name' => ['required', 'string', 'max:120', Rule::unique('roles', 'name')->ignore($ignoreId)],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')],
        ];
    }
}
