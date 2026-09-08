<?php

namespace App\Http\Controllers\Api\Usuarios;

use App\Http\Controllers\Api\Concerns\FormatsApiPagination;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionController extends Controller
{
    use FormatsApiPagination;

    public function roles(Request $request): array
    {
        return $this->paginated(
            Role::query()
                ->with('permissions:id,name')
                ->when($request->string('q')->toString(), fn ($query, string $search) => $query->where('name', 'like', "%{$search}%"))
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

    public function destroyRole(Role $role): Response|JsonResponse
    {
        if ($role->name === 'ADMINISTRADOR') {
            return response()->json([
                'message' => 'No se puede eliminar el rol administrador.',
            ], 422);
        }

        $assignedUsers = DB::table(config('permission.table_names.model_has_roles'))
            ->where('role_id', $role->id)
            ->exists();

        if ($assignedUsers) {
            return response()->json([
                'message' => 'No se puede eliminar un rol asignado a usuarios.',
            ], 422);
        }

        $role->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->noContent();
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
