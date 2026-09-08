<?php

namespace App\Http\Controllers\Api\Usuarios;

use App\Http\Controllers\Api\Concerns\FormatsApiPagination;
use App\Http\Controllers\Controller;
use App\Models\UsuarioAplicativo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UsuarioAplicativoController extends Controller
{
    use FormatsApiPagination;

    public function index(Request $request): array
    {
        $estado = $request->string('estado')->toString() ?: $request->string('status')->toString();

        $query = UsuarioAplicativo::query()
            ->with(['personal', 'tiposVehiculo:id,nombre,estado'])
            ->when($request->string('q')->toString(), function (Builder $q, string $search) {
                $q->where(function (Builder $nested) use ($search) {
                    $nested
                        ->where('nombre', 'like', "%{$search}%")
                        ->orWhere('usuario', 'like', "%{$search}%")
                        ->orWhereHas('personal', function (Builder $personal) use ($search) {
                            $personal
                                ->where('dni', 'like', "%{$search}%")
                                ->orWhere('nombres', 'like', "%{$search}%")
                                ->orWhere('apellidos', 'like', "%{$search}%");
                        });
                });
            })
            ->when($estado, fn (Builder $q, string $value) => $q->where('estado', $value));

        return $this->paginated($query->orderBy('nombre')->paginate($this->perPage()));
    }

    public function show(UsuarioAplicativo $usuarioAplicativo): array
    {
        return [
            'data' => $usuarioAplicativo->load(['personal', 'tiposVehiculo:id,nombre,estado']),
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $tipoIds = $data['tipo_vehiculo_ids'];
        unset($data['tipo_vehiculo_ids']);

        $usuario = UsuarioAplicativo::query()->create($data);
        $usuario->tiposVehiculo()->sync($tipoIds);

        return response()->json([
            'data' => $usuario->load(['personal', 'tiposVehiculo:id,nombre,estado']),
        ], 201);
    }

    public function update(Request $request, UsuarioAplicativo $usuarioAplicativo): JsonResponse
    {
        $data = $request->validate($this->rules($usuarioAplicativo->id, updating: true));
        $tipoIds = $data['tipo_vehiculo_ids'];
        unset($data['tipo_vehiculo_ids']);

        if (($data['password'] ?? null) === null) {
            unset($data['password']);
        }

        $usuarioAplicativo->update($data);
        $usuarioAplicativo->tiposVehiculo()->sync($tipoIds);

        return response()->json([
            'data' => $usuarioAplicativo->refresh()->load(['personal', 'tiposVehiculo:id,nombre,estado']),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(?int $ignoreId = null, bool $updating = false): array
    {
        return [
            'personal_id' => ['nullable', 'integer', Rule::exists('personal', 'id')],
            'nombre' => ['required', 'string', 'max:160'],
            'usuario' => ['required', 'string', 'max:80', Rule::unique('usuarios_aplicativo', 'usuario')->ignore($ignoreId)],
            'password' => [$updating ? 'nullable' : 'required', 'string', 'min:4', 'max:120'],
            'estado' => ['required', Rule::in(['ACTIVO', 'INACTIVO'])],
            'tipo_vehiculo_ids' => ['required', 'array', 'min:1'],
            'tipo_vehiculo_ids.*' => ['integer', Rule::exists('tipos_vehiculo', 'id')],
        ];
    }
}
