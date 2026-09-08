<?php

namespace App\Http\Controllers\Api\Usuarios;

use App\Http\Controllers\Api\Concerns\FormatsApiPagination;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    use FormatsApiPagination;

    public function index(Request $request): array
    {
        $query = User::query()
            ->with('roles:id,name')
            ->when($request->string('q')->toString(), function (Builder $q, string $search) {
                $q->where(function (Builder $nested) use ($search) {
                    $nested
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('dni', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->string('status')->toString(), fn (Builder $q, string $status) => $q->where('status', $status));

        return $this->paginated($query->orderBy('name')->paginate($this->perPage()));
    }

    public function show(User $usuario): array
    {
        return [
            'data' => $usuario->load('roles:id,name', 'permissions:id,name'),
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureEmailForValidation($request);
        $data = $request->validate($this->rules());
        $roles = $data['roles'] ?? [];
        unset($data['roles']);

        $user = User::query()->create($data);
        $user->syncRoles($roles);

        return response()->json([
            'data' => $user->load('roles:id,name', 'permissions:id,name'),
        ], 201);
    }

    public function update(Request $request, User $usuario): JsonResponse
    {
        $this->ensureEmailForValidation($request);
        $data = $request->validate($this->rules($usuario->id, updating: true));
        $roles = $data['roles'] ?? null;
        unset($data['roles']);

        if (($data['password'] ?? null) === null) {
            unset($data['password']);
        }

        $usuario->update($data);

        if (is_array($roles)) {
            $usuario->syncRoles($roles);
        }

        return response()->json([
            'data' => $usuario->refresh()->load('roles:id,name', 'permissions:id,name'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(?int $ignoreId = null, bool $updating = false): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'last_name' => ['nullable', 'string', 'max:120'],
            'dni' => ['nullable', 'string', 'max:20', Rule::unique('users', 'dni')->ignore($ignoreId)],
            'username' => ['required', 'string', 'max:80', Rule::unique('users', 'username')->ignore($ignoreId)],
            'email' => ['nullable', 'email', 'max:160', Rule::unique('users', 'email')->ignore($ignoreId)],
            'password' => [$updating ? 'nullable' : 'required', 'string', 'min:8', 'max:120'],
            'status' => ['required', Rule::in(['ACTIVO', 'INACTIVO'])],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['string', Rule::exists('roles', 'name')],
        ];
    }

    private function defaultEmail(string $username): string
    {
        return "{$username}@agrocontrol.local";
    }

    private function ensureEmailForValidation(Request $request): void
    {
        if ($request->filled('email') || ! $request->filled('username')) {
            return;
        }

        $request->merge([
            'email' => $this->defaultEmail($request->string('username')->toString()),
        ]);
    }
}
