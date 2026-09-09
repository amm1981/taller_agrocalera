<?php

namespace App\Http\Controllers\Api\Horometros;

use App\Domain\Horometros\Services\HorometroService;
use App\Http\Controllers\Controller;
use App\Models\HorometroConfiguracion;
use App\Models\HorometroRegistro;
use App\Models\Lote;
use App\Models\Personal;
use App\Models\Sector;
use App\Models\Sede;
use App\Models\TipoVehiculo;
use App\Models\UsuarioAplicativo;
use App\Models\Vehiculo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AppHorometroController extends Controller
{
    public function __construct(private readonly HorometroService $service) {}

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'usuario' => ['required', 'string', 'max:80'],
            'password' => ['required', 'string', 'max:120'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        $usuario = UsuarioAplicativo::query()
            ->with(['personal', 'tiposVehiculo.configuracionHorometro'])
            ->where('usuario', $data['usuario'])
            ->where('estado', 'ACTIVO')
            ->first();

        if (! $usuario || ! Hash::check($data['password'], $usuario->password)) {
            throw ValidationException::withMessages([
                'usuario' => ['Las credenciales del aplicativo no son validas.'],
            ]);
        }

        $usuario->forceFill(['ultimo_login_at' => now()])->save();

        $token = $usuario->createToken($data['device_name'] ?? 'android-horometro')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $usuario,
            'tipos_registro' => $this->allowedTypes($usuario),
        ]);
    }

    public function sync(Request $request): JsonResponse
    {
        $usuario = $this->appUser($request);
        $tipoIds = $usuario->tiposVehiculo()->where('estado', 'ACTIVO')->pluck('tipos_vehiculo.id')->all();

        return response()->json([
            'data' => [
                'usuario' => $usuario->load('personal'),
                'tipos_registro' => $this->allowedTypes($usuario),
                'vehiculos' => $this->vehicles($tipoIds),
                'operadores' => $this->operators($usuario),
                'pendientes' => $this->pendingQuery($usuario, $tipoIds)->get(),
                'sedes' => Sede::query()->where('estado', 'ACTIVO')->orderBy('nombre')->get(),
                'sectores' => Sector::query()->where('estado', 'ACTIVO')->orderBy('nombre')->get(),
                'lotes' => Lote::query()->where('estado', 'ACTIVO')->orderBy('nombre')->get(),
            ],
        ]);
    }

    public function pendientes(Request $request): JsonResponse
    {
        $usuario = $this->appUser($request);
        $tipoIds = $usuario->tiposVehiculo()->where('estado', 'ACTIVO')->pluck('tipos_vehiculo.id')->all();

        return response()->json([
            'data' => $this->pendingQuery($usuario, $tipoIds)->get(),
        ]);
    }

    public function inicio(Request $request): JsonResponse
    {
        $usuario = $this->appUser($request);
        $vehiculo = $this->authorizedVehicle($request, $usuario);
        $config = $this->configurationForType($vehiculo->tipo_vehiculo_id);
        $fotoRules = $this->photoRules('foto_inicial_base64', $config);

        $data = $request->validate([
            'vehiculo_id' => ['required', 'integer', Rule::exists('vehiculos', 'id')],
            'client_reference' => ['nullable', 'string', 'max:100'],
            'fecha' => ['nullable', 'date'],
            'operario_id' => ['nullable', 'integer', Rule::exists('personal', 'id')],
            'fundo_id' => ['nullable', 'integer', Rule::exists('fundos', 'id')],
            'sector_id' => ['nullable', 'integer', Rule::exists('sectores', 'id')],
            'lote_id' => ['nullable', 'integer', Rule::exists('lotes', 'id')],
            'horometro_inicial_ocr' => ['nullable', 'numeric', 'min:0'],
            'horometro_inicial_confirmado' => ['required', 'numeric', 'min:0'],
            'foto_inicial' => $fotoRules['path'],
            'foto_inicial_base64' => ['nullable', 'string'],
            'fecha_hora_inicio' => ['nullable', 'date'],
            'correccion_manual_inicio' => ['nullable', 'boolean'],
        ]);

        if ($usuario->personal_id && empty($data['operario_id'])) {
            $data['operario_id'] = $usuario->personal_id;
        }

        if ($path = $this->storeEvidenceImage($data['foto_inicial_base64'] ?? null, 'inicio')) {
            $data['foto_inicial'] = $path;
        }

        unset($data['foto_inicial_base64']);
        $data = $this->normalizeLocation($data);

        return response()->json([
            'data' => $this->service->registrarInicio($data, $usuario),
        ], 201);
    }

    public function cierre(Request $request, HorometroRegistro $registro): JsonResponse
    {
        $usuario = $this->appUser($request);
        $registro->load('vehiculo.tipoVehiculo');

        abort_unless($registro->vehiculo && $usuario->tiposVehiculo()->whereKey($registro->vehiculo->tipo_vehiculo_id)->exists(), 403);
        abort_unless($registro->usuario_aplicativo_id === $usuario->id || $registro->operario_id === $usuario->personal_id, 403);

        $config = $this->configurationForType($registro->vehiculo->tipo_vehiculo_id);
        $fotoRules = $this->photoRules('foto_final_base64', $config);

        $data = $request->validate([
            'horometro_final_ocr' => ['nullable', 'numeric', 'min:0'],
            'horometro_final_confirmado' => ['required', 'numeric', 'min:0'],
            'foto_final' => $fotoRules['path'],
            'foto_final_base64' => ['nullable', 'string'],
            'fecha_hora_final' => ['nullable', 'date'],
            'correccion_manual_final' => ['nullable', 'boolean'],
        ]);

        if ($path = $this->storeEvidenceImage($data['foto_final_base64'] ?? null, 'cierre')) {
            $data['foto_final'] = $path;
        }

        unset($data['foto_final_base64']);

        return response()->json([
            'data' => $this->service->registrarCierre($registro, $data, $usuario),
        ]);
    }

    private function appUser(Request $request): UsuarioAplicativo
    {
        $user = $request->user();

        abort_unless($user instanceof UsuarioAplicativo && $user->estado === 'ACTIVO', 403);

        return $user;
    }

    private function allowedTypes(UsuarioAplicativo $usuario)
    {
        return $usuario->tiposVehiculo()
            ->where('estado', 'ACTIVO')
            ->with('configuracionHorometro')
            ->orderBy('nombre')
            ->get();
    }

    /**
     * @param  array<int, int>  $tipoIds
     */
    private function vehicles(array $tipoIds)
    {
        return Vehiculo::query()
            ->addSelect(['ultimo_horometro_valido' => HorometroRegistro::query()
                ->selectRaw('COALESCE(horometro_final_confirmado, horometro_inicial_confirmado)')
                ->whereColumn('vehiculo_id', 'vehiculos.id')
                ->where(function (Builder $query) {
                    $query->where('horometro_final_confirmado', '>', 0)
                        ->orWhere('horometro_inicial_confirmado', '>', 0);
                })
                ->orderByDesc('fecha')
                ->orderByDesc('id')
                ->limit(1)])
            ->with(['tipoVehiculo', 'sede'])
            ->where('activo', true)
            ->whereIn('tipo_vehiculo_id', $tipoIds)
            ->orderBy('codigo')
            ->get()
            ->each(function (Vehiculo $vehiculo) {
                $vehiculo->ultimo_horometro_valido ??= ((float) $vehiculo->horometro_base > 0 ? $vehiculo->horometro_base : null);
                $vehiculo->tiene_horometro_base = $vehiculo->ultimo_horometro_valido !== null && (float) $vehiculo->ultimo_horometro_valido > 0;
            });
    }

    private function operators(UsuarioAplicativo $usuario)
    {
        $tiposRegistro = $usuario->tiposVehiculo()
            ->with('configuracionHorometro')
            ->get();
        $personalTipos = $tiposRegistro
            ->flatMap(fn (TipoVehiculo $tipo) => $this->configuredPersonalTypes($tipo))
            ->filter()
            ->map(fn (string $tipo) => strtoupper($tipo))
            ->unique()
            ->values()
            ->all();
        $personalUsuario = $usuario->personal;
        $soloPropio = $personalUsuario !== null
            && $personalTipos !== []
            && in_array(strtoupper($personalUsuario->tipo), $personalTipos, true);

        return Personal::query()
            ->when($soloPropio, fn (Builder $query) => $query->whereKey($personalUsuario->id))
            ->when(! $soloPropio && $personalTipos !== [], fn (Builder $query) => $query->whereIn(DB::raw('UPPER(tipo)'), $personalTipos))
            ->when(! $soloPropio && $personalTipos === [] && $usuario->personal_id, fn (Builder $query, int $personalId) => $query->whereKey($personalId))
            ->where('estado', 'ACTIVO')
            ->orderBy('nombres')
            ->get();
    }

    /**
     * @return array<int, string>
     */
    private function configuredPersonalTypes(TipoVehiculo $tipo): array
    {
        $parametros = $tipo->configuracionHorometro?->parametros_adicionales ?? [];
        $tipos = $parametros['personal_tipos'] ?? [];

        if (is_array($tipos) && $tipos !== []) {
            return $tipos;
        }

        $label = strtolower($tipo->nombre);

        if (str_contains($label, 'maquinaria') || str_contains($label, 'pesada')) {
            return ['MAQUINISTA'];
        }

        if (str_contains($label, 'tractor')) {
            return ['TRACTORISTA', 'OPERARIO', 'CONDUCTOR'];
        }

        return [];
    }

    /**
     * @param  array<int, int>  $tipoIds
     */
    private function pendingQuery(UsuarioAplicativo $usuario, array $tipoIds): Builder
    {
        return HorometroRegistro::query()
            ->with(['vehiculo.tipoVehiculo', 'operario', 'usuarioAplicativo'])
            ->whereHas('vehiculo', fn (Builder $query) => $query->whereIn('tipo_vehiculo_id', $tipoIds))
            ->where(function (Builder $query) use ($usuario) {
                $query->where('usuario_aplicativo_id', $usuario->id);

                if ($usuario->personal_id) {
                    $query->orWhere('operario_id', $usuario->personal_id);
                }
            })
            ->whereIn('estado', ['PENDIENTE_INICIO', 'EN_JORNADA', 'SIN_INICIO', 'SIN_CIERRE', 'INCONSISTENCIA', 'OBSERVADO'])
            ->orderByDesc('fecha')
            ->orderByDesc('id');
    }

    private function authorizedVehicle(Request $request, UsuarioAplicativo $usuario): Vehiculo
    {
        $vehiculo = Vehiculo::query()->findOrFail((int) $request->input('vehiculo_id'));

        abort_unless($usuario->tiposVehiculo()->whereKey($vehiculo->tipo_vehiculo_id)->exists(), 403);

        return $vehiculo;
    }

    private function configurationForType(?int $tipoVehiculoId): HorometroConfiguracion
    {
        return HorometroConfiguracion::query()
            ->where('tipo_vehiculo_id', $tipoVehiculoId)
            ->first()
            ?? HorometroConfiguracion::query()->create(['tipo_vehiculo_id' => $tipoVehiculoId]);
    }

    /**
     * @return array{path: array<int, mixed>}
     */
    private function photoRules(string $base64Field, HorometroConfiguracion $config): array
    {
        $required = ($config->campos_requeridos['foto'] ?? $config->foto_obligatoria) && $config->foto_obligatoria
            ? "required_without:{$base64Field}"
            : 'nullable';

        return [
            'path' => [$required, 'nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeLocation(array $data): array
    {
        if (! empty($data['lote_id'])) {
            $lote = Lote::query()
                ->with('sector')
                ->findOrFail($data['lote_id']);

            $data['sector_id'] = $lote->sector_id;
            $data['fundo_id'] = $lote->sector?->fundo_id ?? $data['fundo_id'] ?? null;

            return $data;
        }

        if (! empty($data['sector_id'])) {
            $sector = Sector::query()->findOrFail($data['sector_id']);
            $data['fundo_id'] = $sector->fundo_id;
        }

        return $data;
    }

    private function storeEvidenceImage(?string $base64, string $kind): ?string
    {
        if (! $base64) {
            return null;
        }

        $payload = Str::of($base64)->after('base64,')->toString();
        $binary = base64_decode($payload, true);

        if ($binary === false) {
            $field = $kind === 'inicio' ? 'foto_inicial_base64' : 'foto_final_base64';

            throw ValidationException::withMessages([
                $field => ['La imagen enviada no tiene un formato base64 valido.'],
            ]);
        }

        $path = sprintf(
            'horometros/%s/%s-%s.jpg',
            now()->format('Y/m/d'),
            $kind,
            (string) Str::uuid(),
        );

        Storage::disk(config('filesystems.evidence_disk', 'public'))->put($path, $binary);

        return $path;
    }
}
