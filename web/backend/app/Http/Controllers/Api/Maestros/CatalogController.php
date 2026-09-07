<?php

namespace App\Http\Controllers\Api\Maestros;

use App\Http\Controllers\Api\Concerns\FormatsApiPagination;
use App\Http\Controllers\Controller;
use App\Models\Fundo;
use App\Models\Gerencia;
use App\Models\Lote;
use App\Models\Sector;
use App\Models\Sede;
use App\Models\TipoFalla;
use App\Models\TipoVehiculo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CatalogController extends Controller
{
    use FormatsApiPagination;

    public function indexGerencias(Request $request): array
    {
        return $this->indexSimple(Gerencia::query(), $request);
    }

    public function storeGerencia(Request $request): JsonResponse
    {
        return $this->storeSimple(Gerencia::class, $request, $this->simpleRules('gerencias'));
    }

    public function updateGerencia(Request $request, Gerencia $gerencia): JsonResponse
    {
        return $this->updateSimple($gerencia, $request, $this->simpleRules('gerencias', $gerencia->id));
    }

    public function indexSedes(Request $request): array
    {
        return $this->indexSimple(Sede::query(), $request);
    }

    public function storeSede(Request $request): JsonResponse
    {
        return $this->storeSimple(Sede::class, $request, $this->simpleRules('sedes'));
    }

    public function updateSede(Request $request, Sede $sede): JsonResponse
    {
        return $this->updateSimple($sede, $request, $this->simpleRules('sedes', $sede->id));
    }

    public function indexFundos(Request $request): array
    {
        $query = Fundo::query()->with('sede');

        $this->applySimpleFilters($query, $request);
        $query->when($request->integer('sede_id'), fn (Builder $q, int $sedeId) => $q->where('sede_id', $sedeId));

        return $this->paginated($query->orderBy('nombre')->paginate($this->perPage()));
    }

    public function storeFundo(Request $request): JsonResponse
    {
        return $this->storeSimple(Fundo::class, $request, $this->locationRules('fundos', 'sede_id', 'sedes'));
    }

    public function updateFundo(Request $request, Fundo $fundo): JsonResponse
    {
        return $this->updateSimple($fundo, $request, $this->locationRules('fundos', 'sede_id', 'sedes', $fundo->id));
    }

    public function indexSectores(Request $request): array
    {
        $query = Sector::query()->with('fundo.sede');

        $this->applySimpleFilters($query, $request);
        $query->when($request->integer('fundo_id'), fn (Builder $q, int $fundoId) => $q->where('fundo_id', $fundoId));

        return $this->paginated($query->orderBy('nombre')->paginate($this->perPage()));
    }

    public function storeSector(Request $request): JsonResponse
    {
        return $this->storeSimple(Sector::class, $request, $this->locationRules('sectores', 'fundo_id', 'fundos'));
    }

    public function updateSector(Request $request, Sector $sector): JsonResponse
    {
        return $this->updateSimple($sector, $request, $this->locationRules('sectores', 'fundo_id', 'fundos', $sector->id));
    }

    public function indexLotes(Request $request): array
    {
        $query = Lote::query()->with('sector.fundo.sede');

        $this->applySimpleFilters($query, $request);
        $query->when($request->integer('sector_id'), fn (Builder $q, int $sectorId) => $q->where('sector_id', $sectorId));

        return $this->paginated($query->orderBy('nombre')->paginate($this->perPage()));
    }

    public function storeLote(Request $request): JsonResponse
    {
        return $this->storeSimple(Lote::class, $request, $this->locationRules('lotes', 'sector_id', 'sectores'));
    }

    public function updateLote(Request $request, Lote $lote): JsonResponse
    {
        return $this->updateSimple($lote, $request, $this->locationRules('lotes', 'sector_id', 'sectores', $lote->id));
    }

    public function indexTiposVehiculo(Request $request): array
    {
        $query = TipoVehiculo::query();

        $this->applySimpleFilters($query, $request, hasCodigo: false);
        $query
            ->when($request->boolean('requiere_horometro'), fn (Builder $q) => $q->where('requiere_horometro', true))
            ->when($request->boolean('requiere_login_horometro'), fn (Builder $q) => $q->where('requiere_login_horometro', true));

        return $this->paginated($query->orderBy('nombre')->paginate($this->perPage()));
    }

    public function storeTipoVehiculo(Request $request): JsonResponse
    {
        return $this->storeSimple(TipoVehiculo::class, $request, $this->tipoVehiculoRules());
    }

    public function updateTipoVehiculo(Request $request, TipoVehiculo $tipoVehiculo): JsonResponse
    {
        return $this->updateSimple($tipoVehiculo, $request, $this->tipoVehiculoRules($tipoVehiculo->id));
    }

    public function indexTiposFalla(Request $request): array
    {
        $query = TipoFalla::query();

        $this->applySimpleFilters($query, $request, hasCodigo: false);

        return $this->paginated($query->orderBy('nombre')->paginate($this->perPage()));
    }

    public function storeTipoFalla(Request $request): JsonResponse
    {
        return $this->storeSimple(TipoFalla::class, $request, [
            'nombre' => ['required', 'string', 'max:120', Rule::unique('tipos_falla', 'nombre')],
            'estado' => ['nullable', Rule::in(['ACTIVO', 'INACTIVO'])],
        ]);
    }

    public function updateTipoFalla(Request $request, TipoFalla $tipoFalla): JsonResponse
    {
        return $this->updateSimple($tipoFalla, $request, [
            'nombre' => ['required', 'string', 'max:120', Rule::unique('tipos_falla', 'nombre')->ignore($tipoFalla->id)],
            'estado' => ['nullable', Rule::in(['ACTIVO', 'INACTIVO'])],
        ]);
    }

    private function indexSimple(Builder $query, Request $request): array
    {
        $this->applySimpleFilters($query, $request);

        return $this->paginated($query->orderBy('nombre')->paginate($this->perPage()));
    }

    private function applySimpleFilters(Builder $query, Request $request, bool $hasCodigo = true): void
    {
        $query
            ->when($request->string('estado')->toString(), fn (Builder $q, string $estado) => $q->where('estado', $estado))
            ->when($request->string('q')->toString(), function (Builder $q, string $search) use ($hasCodigo) {
                $q->where(function (Builder $nested) use ($search, $hasCodigo) {
                    $nested->where('nombre', 'like', "%{$search}%");

                    if ($hasCodigo) {
                        $nested->orWhere('codigo', 'like', "%{$search}%");
                    }
                });
            });
    }

    /**
     * @param  class-string<Model>  $modelClass
     * @param  array<string, mixed>  $rules
     */
    private function storeSimple(string $modelClass, Request $request, array $rules): JsonResponse
    {
        $model = $modelClass::query()->create($request->validate($rules));

        return response()->json(['data' => $model], 201);
    }

    /**
     * @param  array<string, mixed>  $rules
     */
    private function updateSimple(Model $model, Request $request, array $rules): JsonResponse
    {
        $model->update($request->validate($rules));

        return response()->json(['data' => $model->refresh()]);
    }

    /**
     * @return array<string, mixed>
     */
    private function simpleRules(string $table, ?int $ignoreId = null): array
    {
        return [
            'codigo' => ['required', 'string', 'max:30', Rule::unique($table, 'codigo')->ignore($ignoreId)],
            'nombre' => ['required', 'string', 'max:120', Rule::unique($table, 'nombre')->ignore($ignoreId)],
            'estado' => ['nullable', Rule::in(['ACTIVO', 'INACTIVO'])],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function locationRules(string $table, string $foreignKey, string $foreignTable, ?int $ignoreId = null): array
    {
        return [
            $foreignKey => ['required', 'integer', Rule::exists($foreignTable, 'id')],
            'codigo' => ['required', 'string', 'max:30', Rule::unique($table, 'codigo')->ignore($ignoreId)],
            'nombre' => ['required', 'string', 'max:120'],
            'estado' => ['nullable', Rule::in(['ACTIVO', 'INACTIVO'])],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function tipoVehiculoRules(?int $ignoreId = null): array
    {
        return [
            'nombre' => [
                'required',
                'string',
                'max:120',
                Rule::in(['Tractor', 'Maquinaria Pesada']),
                Rule::unique('tipos_vehiculo', 'nombre')->ignore($ignoreId),
            ],
            'requiere_horometro' => ['required', 'boolean'],
            'requiere_login_horometro' => ['required', 'boolean'],
            'estado' => ['nullable', Rule::in(['ACTIVO', 'INACTIVO'])],
        ];
    }

}
