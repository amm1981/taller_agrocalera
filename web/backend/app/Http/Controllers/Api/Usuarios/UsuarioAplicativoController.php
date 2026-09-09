<?php

namespace App\Http\Controllers\Api\Usuarios;

use App\Http\Controllers\Api\Concerns\FormatsApiPagination;
use App\Http\Controllers\Controller;
use App\Models\Personal;
use App\Models\TipoVehiculo;
use App\Models\UsuarioAplicativo;
use App\Support\SimpleXlsx;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

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

    public function importTemplate(): BinaryFileResponse
    {
        $personal = Personal::query()
            ->where('estado', 'ACTIVO')
            ->orderBy('dni')
            ->get()
            ->map(fn (Personal $persona) => "{$persona->dni} - {$persona->nombres} {$persona->apellidos}")
            ->values()
            ->all();
        $tiposVehiculo = TipoVehiculo::query()
            ->where('estado', 'ACTIVO')
            ->orderBy('nombre')
            ->pluck('nombre')
            ->values()
            ->all();

        $path = SimpleXlsx::createTemplate(
            ['dni_personal', 'nombre', 'usuario', 'contrasena', 'tipos_registro', 'estado'],
            [
                [$personal[0] ?? '', 'Usuario App', 'usuario_app', 'usuario_app', $tiposVehiculo[0] ?? 'Tractor', 'ACTIVO'],
            ],
            [
                'dni_personal' => $personal,
                'tipos_registro' => $tiposVehiculo,
                'estado' => ['ACTIVO', 'INACTIVO'],
            ],
            [
                'dni_personal' => 'dni_personal',
                'tipos_registro' => 'tipos_registro',
                'estado' => 'estado',
            ],
            'Usuarios App',
        );

        return response()
            ->download($path, 'importador_usuarios_aplicativo.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend();
    }

    public function bulkImport(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'rows' => ['required', 'array', 'min:1', 'max:1000'],
            'rows.*.dni_personal' => ['nullable', 'string', 'max:180'],
            'rows.*.nombre' => ['nullable', 'string', 'max:160'],
            'rows.*.usuario' => ['required', 'string', 'max:80'],
            'rows.*.contrasena' => ['nullable', 'string', 'max:120'],
            'rows.*.tipos_registro' => ['required', 'string', 'max:400'],
            'rows.*.estado' => ['nullable', 'string', 'max:20'],
        ]);

        $personal = Personal::query()->get();
        $tiposVehiculo = TipoVehiculo::query()->where('estado', 'ACTIVO')->get();

        $summary = DB::transaction(function () use ($payload, $personal, $tiposVehiculo) {
            $summary = [
                'usuarios_creados' => 0,
                'usuarios_actualizados' => 0,
            ];

            foreach ($payload['rows'] as $row) {
                $persona = $this->resolvePersonal($personal, $row['dni_personal'] ?? null);
                $usuario = $this->cleanText($row['usuario']);
                $existing = UsuarioAplicativo::query()->where('usuario', $usuario)->first();
                $data = [
                    'personal_id' => $persona?->id,
                    'nombre' => $this->cleanNullableText($row['nombre'] ?? null)
                        ?? ($persona ? "{$persona->nombres} {$persona->apellidos}" : $usuario),
                    'usuario' => $usuario,
                    'estado' => $this->normalizeStatus($row['estado'] ?? 'ACTIVO'),
                ];
                $password = $this->cleanNullableText($row['contrasena'] ?? null);

                if ($password !== null || ! $existing) {
                    $data['password'] = $password ?? $persona?->dni ?? $usuario;
                }

                $appUser = UsuarioAplicativo::query()->updateOrCreate(['usuario' => $usuario], $data);
                $appUser->tiposVehiculo()->sync($this->resolveTipoVehiculoIds($tiposVehiculo, $row['tipos_registro']));

                $summary[$appUser->wasRecentlyCreated ? 'usuarios_creados' : 'usuarios_actualizados']++;
            }

            return $summary;
        });

        return response()->json(['data' => $summary]);
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

    /**
     * @param Collection<int, Personal> $items
     */
    private function resolvePersonal(Collection $items, ?string $value): ?Personal
    {
        $value = $this->cleanNullableText($value);

        if ($value === null) {
            return null;
        }

        $normalized = $this->normalizeComparable($value);

        foreach ($items as $item) {
            if (
                $normalized === $this->normalizeComparable($item->dni)
                || $normalized === $this->normalizeComparable("{$item->dni} - {$item->nombres} {$item->apellidos}")
            ) {
                return $item;
            }
        }

        throw ValidationException::withMessages([
            'rows' => ["No se encontró el personal: {$value}."],
        ]);
    }

    /**
     * @param Collection<int, TipoVehiculo> $items
     * @return array<int, int>
     */
    private function resolveTipoVehiculoIds(Collection $items, string $value): array
    {
        $labels = collect(preg_split('/[|,;]/', $value) ?: [])
            ->map(fn (string $item) => $this->cleanNullableText($item))
            ->filter()
            ->values();
        $ids = [];

        foreach ($labels as $label) {
            $normalized = $this->normalizeComparable($label);
            $tipo = $items->first(fn (TipoVehiculo $item) => $normalized === $this->normalizeComparable($item->nombre));

            if (! $tipo) {
                throw ValidationException::withMessages([
                    'rows' => ["No se encontró el tipo de registro: {$label}."],
                ]);
            }

            $ids[] = $tipo->id;
        }

        return array_values(array_unique($ids));
    }

    private function normalizeStatus(?string $value): string
    {
        $status = strtoupper(str($value ?: 'ACTIVO')->squish()->toString());

        if (! in_array($status, ['ACTIVO', 'INACTIVO'], true)) {
            throw ValidationException::withMessages([
                'rows' => ["Estado de usuario aplicativo no válido: {$value}."],
            ]);
        }

        return $status;
    }

    private function cleanText(string $value): string
    {
        return str($value)->squish()->toString();
    }

    private function cleanNullableText(?string $value): ?string
    {
        $value = str((string) $value)->squish()->toString();

        return $value === '' ? null : $value;
    }

    private function normalizeComparable(?string $value): string
    {
        return str($value ?? '')
            ->lower()
            ->ascii()
            ->squish()
            ->toString();
    }
}
