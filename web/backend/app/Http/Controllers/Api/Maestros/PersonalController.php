<?php

namespace App\Http\Controllers\Api\Maestros;

use App\Http\Controllers\Api\Concerns\FormatsApiPagination;
use App\Http\Controllers\Controller;
use App\Models\Gerencia;
use App\Models\Personal;
use App\Models\Sede;
use App\Models\TipoPersonal;
use App\Support\SimpleXlsx;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PersonalController extends Controller
{
    use FormatsApiPagination;

    public function index(Request $request): array
    {
        $query = Personal::query()
            ->with(['gerencia', 'sede'])
            ->when($request->string('q')->toString(), function (Builder $q, string $search) {
                $q->where(function (Builder $nested) use ($search) {
                    $nested
                        ->where('dni', 'like', "%{$search}%")
                        ->orWhere('nombres', 'like', "%{$search}%")
                        ->orWhere('apellidos', 'like', "%{$search}%");
                });
            })
            ->when($request->string('tipo')->toString(), fn (Builder $q, string $tipo) => $q->where('tipo', $tipo))
            ->when($request->string('estado')->toString(), fn (Builder $q, string $estado) => $q->where('estado', $estado))
            ->when($request->integer('gerencia_id'), fn (Builder $q, int $gerenciaId) => $q->where('gerencia_id', $gerenciaId))
            ->when($request->integer('sede_id'), fn (Builder $q, int $sedeId) => $q->where('sede_id', $sedeId));

        return $this->paginated($query->orderBy('apellidos')->orderBy('nombres')->paginate($this->perPage()));
    }

    public function store(Request $request): JsonResponse
    {
        $personal = Personal::query()->create($request->validate($this->rules()));

        return response()->json(['data' => $personal->load(['gerencia', 'sede'])], 201);
    }

    public function update(Request $request, Personal $personal): JsonResponse
    {
        $personal->update($request->validate($this->rules($personal->id)));

        return response()->json(['data' => $personal->refresh()->load(['gerencia', 'sede'])]);
    }

    public function importTemplate(): BinaryFileResponse
    {
        $gerencias = Gerencia::query()
            ->where('estado', 'ACTIVO')
            ->orderBy('codigo')
            ->get()
            ->map(fn (Gerencia $gerencia) => $this->catalogLabel($gerencia))
            ->values()
            ->all();
        $sedes = Sede::query()
            ->where('estado', 'ACTIVO')
            ->orderBy('codigo')
            ->get()
            ->map(fn (Sede $sede) => $this->catalogLabel($sede))
            ->values()
            ->all();
        $tiposPersonal = TipoPersonal::query()
            ->where('estado', 'ACTIVO')
            ->orderBy('codigo')
            ->pluck('codigo')
            ->values()
            ->all();

        $path = SimpleXlsx::createTemplate(
            ['dni', 'nombres', 'apellidos', 'tipo', 'gerencia', 'sede', 'estado'],
            [
                ['87654321', 'Luis', 'Quispe', $tiposPersonal[0] ?? 'OPERARIO', $gerencias[0] ?? '', $sedes[0] ?? '', 'ACTIVO'],
            ],
            [
                'tipo' => $tiposPersonal,
                'gerencia' => $gerencias,
                'sede' => $sedes,
                'estado' => ['ACTIVO', 'INACTIVO'],
            ],
            [
                'tipo' => 'tipo',
                'gerencia' => 'gerencia',
                'sede' => 'sede',
                'estado' => 'estado',
            ],
            'Personal',
        );

        return response()
            ->download($path, 'importador_personal.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend();
    }

    public function bulkImport(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'rows' => ['required', 'array', 'min:1', 'max:1000'],
            'rows.*.dni' => ['required', 'string', 'max:20'],
            'rows.*.nombres' => ['required', 'string', 'max:120'],
            'rows.*.apellidos' => ['required', 'string', 'max:120'],
            'rows.*.tipo' => ['required', 'string', 'max:40'],
            'rows.*.gerencia' => ['nullable', 'string', 'max:180'],
            'rows.*.sede' => ['nullable', 'string', 'max:180'],
            'rows.*.estado' => ['nullable', 'string', 'max:20'],
        ]);

        $gerencias = Gerencia::query()->get();
        $sedes = Sede::query()->get();

        $summary = DB::transaction(function () use ($payload, $gerencias, $sedes) {
            $summary = [
                'personal_creado' => 0,
                'personal_actualizado' => 0,
            ];

            foreach ($payload['rows'] as $row) {
                $personal = Personal::query()->updateOrCreate(
                    ['dni' => $this->cleanText($row['dni'])],
                    [
                        'nombres' => $this->cleanText($row['nombres']),
                        'apellidos' => $this->cleanText($row['apellidos']),
                        'tipo' => $this->normalizeType($row['tipo']),
                        'gerencia_id' => $this->resolveCatalogId($gerencias, $row['gerencia'] ?? null, 'gerencia'),
                        'sede_id' => $this->resolveCatalogId($sedes, $row['sede'] ?? null, 'sede'),
                        'estado' => $this->normalizeStatus($row['estado'] ?? 'ACTIVO'),
                    ],
                );

                $summary[$personal->wasRecentlyCreated ? 'personal_creado' : 'personal_actualizado']++;
            }

            return $summary;
        });

        return response()->json(['data' => $summary]);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(?int $ignoreId = null): array
    {
        return [
            'dni' => ['required', 'string', 'max:20', Rule::unique('personal', 'dni')->ignore($ignoreId)],
            'nombres' => ['required', 'string', 'max:120'],
            'apellidos' => ['required', 'string', 'max:120'],
            'tipo' => ['required', 'string', Rule::exists('tipos_personal', 'codigo')->where('estado', 'ACTIVO')],
            'gerencia_id' => ['nullable', 'integer', Rule::exists('gerencias', 'id')],
            'sede_id' => ['nullable', 'integer', Rule::exists('sedes', 'id')],
            'estado' => ['required', Rule::in(['ACTIVO', 'INACTIVO'])],
        ];
    }

    private function normalizeType(string $value): string
    {
        $type = strtoupper(str($value)->squish()->replace(' ', '_')->toString());

        if (! TipoPersonal::query()->where('codigo', $type)->where('estado', 'ACTIVO')->exists()) {
            throw ValidationException::withMessages([
                'rows' => ["Tipo de personal no válido: {$value}."],
            ]);
        }

        return $type;
    }

    private function normalizeStatus(?string $value): string
    {
        $status = strtoupper(str($value ?: 'ACTIVO')->squish()->toString());

        if (! in_array($status, ['ACTIVO', 'INACTIVO'], true)) {
            throw ValidationException::withMessages([
                'rows' => ["Estado de personal no válido: {$value}."],
            ]);
        }

        return $status;
    }

    /**
     * @param Collection<int, Gerencia|Sede> $items
     */
    private function resolveCatalogId(Collection $items, ?string $value, string $label): ?int
    {
        $value = $this->cleanNullableText($value);

        if ($value === null) {
            return null;
        }

        $normalized = $this->normalizeComparable($value);

        foreach ($items as $item) {
            if (
                $normalized === $this->normalizeComparable($item->codigo)
                || $normalized === $this->normalizeComparable($item->nombre)
                || $normalized === $this->normalizeComparable($this->catalogLabel($item))
            ) {
                return $item->id;
            }
        }

        throw ValidationException::withMessages([
            'rows' => ["No se encontró {$label}: {$value}."],
        ]);
    }

    private function catalogLabel(Gerencia|Sede $item): string
    {
        return "{$item->codigo} - {$item->nombre}";
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
