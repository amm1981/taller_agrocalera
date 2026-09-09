<?php

namespace App\Http\Controllers\Api\Horometros;

use App\Http\Controllers\Controller;
use App\Models\HorometroConfiguracion;
use App\Models\TipoVehiculo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ConfiguracionController extends Controller
{
    public function index(): array
    {
        $tipos = TipoVehiculo::query()
            ->with('configuracionHorometro')
            ->orderBy('nombre')
            ->get()
            ->map(function (TipoVehiculo $tipoVehiculo) {
                $configuracion = $tipoVehiculo->configuracionHorometro
                    ?? HorometroConfiguracion::query()->create(['tipo_vehiculo_id' => $tipoVehiculo->id]);

                return [
                    'tipo_vehiculo' => $tipoVehiculo,
                    'configuracion' => $configuracion,
                ];
            });

        return ['data' => $tipos];
    }

    public function show(): array
    {
        return ['data' => $this->configuracion()];
    }

    public function store(Request $request): array
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:120', Rule::unique('tipos_vehiculo', 'nombre')],
            'icono' => ['required', 'file', 'mimes:png', 'max:128'],
        ]);

        $file = $request->file('icono');
        $this->validateIcon($file);

        $tipoVehiculo = TipoVehiculo::query()->create([
            'nombre' => $data['nombre'],
            'requiere_horometro' => true,
            'requiere_login_horometro' => false,
            'estado' => 'ACTIVO',
        ]);

        $tipoVehiculo->update(['icono_path' => $this->storeIcon($tipoVehiculo, $file)]);

        $configuracion = HorometroConfiguracion::query()->create([
            'tipo_vehiculo_id' => $tipoVehiculo->id,
        ]);

        return [
            'data' => [
                'tipo_vehiculo' => $tipoVehiculo->refresh(),
                'configuracion' => $configuracion->refresh(),
            ],
        ];
    }

    public function updateTipo(Request $request, TipoVehiculo $tipoVehiculo): array
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:120', Rule::unique('tipos_vehiculo', 'nombre')->ignore($tipoVehiculo->id)],
            'estado' => ['required', Rule::in(['ACTIVO', 'INACTIVO'])],
            'icono' => ['nullable', 'file', 'mimes:png', 'max:128'],
        ]);

        $payload = [
            'nombre' => $data['nombre'],
            'estado' => $data['estado'],
        ];

        if ($request->hasFile('icono')) {
            $file = $request->file('icono');
            $this->validateIcon($file);
            $oldPath = $tipoVehiculo->icono_path;
            $payload['icono_path'] = $this->storeIcon($tipoVehiculo, $file);

            if ($oldPath && $oldPath !== $payload['icono_path']) {
                Storage::disk(config('filesystems.evidence_disk', 'public'))->delete($oldPath);
            }
        }

        $tipoVehiculo->update($payload);
        $configuracion = $tipoVehiculo->configuracionHorometro
            ?? HorometroConfiguracion::query()->create(['tipo_vehiculo_id' => $tipoVehiculo->id]);

        return [
            'data' => [
                'tipo_vehiculo' => $tipoVehiculo->refresh(),
                'configuracion' => $configuracion->refresh(),
            ],
        ];
    }

    public function update(Request $request): array
    {
        $data = $request->validate([
            'hora_inicio_desde' => ['required', 'date_format:H:i'],
            'hora_inicio_hasta' => ['required', 'date_format:H:i'],
            'hora_cierre_hasta' => ['required', 'date_format:H:i'],
            'tolerancia_inicio_horas' => ['required', 'numeric', 'min:0', 'max:999'],
            'tolerancia_maxima_horas_dia' => ['required', 'numeric', 'min:0', 'max:999'],
            'permite_correccion_manual' => ['required', 'boolean'],
            'foto_obligatoria' => ['required', 'boolean'],
            'vigencia_reapertura_minutos' => ['required', 'integer', 'min:15', 'max:1440'],
            'ocr_activo' => ['required', 'boolean'],
        ]);

        $data['hora_inicio_desde'] = "{$data['hora_inicio_desde']}:00";
        $data['hora_inicio_hasta'] = "{$data['hora_inicio_hasta']}:00";
        $data['hora_cierre_hasta'] = "{$data['hora_cierre_hasta']}:00";

        $configuracion = $this->configuracion();
        $configuracion->update($data);

        return ['data' => $configuracion->refresh()];
    }

    public function updateByTipo(Request $request, TipoVehiculo $tipoVehiculo): array
    {
        $data = $request->validate([
            'hora_inicio_desde' => ['required', 'date_format:H:i'],
            'hora_inicio_hasta' => ['required', 'date_format:H:i'],
            'hora_cierre_hasta' => ['required', 'date_format:H:i'],
            'tolerancia_inicio_horas' => ['required', 'numeric', 'min:0', 'max:999'],
            'tolerancia_maxima_horas_dia' => ['required', 'numeric', 'min:0', 'max:999'],
            'permite_correccion_manual' => ['required', 'boolean'],
            'foto_obligatoria' => ['required', 'boolean'],
            'vigencia_reapertura_minutos' => ['required', 'integer', 'min:15', 'max:1440'],
            'ocr_activo' => ['required', 'boolean'],
            'campos_requeridos' => ['nullable', 'array'],
            'campos_requeridos.sede' => ['nullable', 'boolean'],
            'campos_requeridos.operario' => ['nullable', 'boolean'],
            'campos_requeridos.foto' => ['nullable', 'boolean'],
            'parametros_adicionales' => ['nullable', 'array'],
            'parametros_adicionales.personal_tipos' => ['nullable', 'array'],
            'parametros_adicionales.personal_tipos.*' => ['string', 'max:80'],
        ]);

        $data['hora_inicio_desde'] = "{$data['hora_inicio_desde']}:00";
        $data['hora_inicio_hasta'] = "{$data['hora_inicio_hasta']}:00";
        $data['hora_cierre_hasta'] = "{$data['hora_cierre_hasta']}:00";

        $configuracion = HorometroConfiguracion::query()->firstOrCreate([
            'tipo_vehiculo_id' => $tipoVehiculo->id,
        ]);
        $configuracion->update($data);

        return ['data' => $configuracion->refresh()];
    }

    private function configuracion(): HorometroConfiguracion
    {
        return HorometroConfiguracion::query()->whereNull('tipo_vehiculo_id')->first()
            ?? HorometroConfiguracion::query()->first()
            ?? HorometroConfiguracion::query()->create([]);
    }

    private function validateIcon($file): void
    {
        $size = $file ? @getimagesize($file->getRealPath()) : false;

        if (! $size || $size[0] > 50 || $size[1] > 50) {
            throw ValidationException::withMessages([
                'icono' => ['El icono debe ser PNG y no debe superar 50x50 px.'],
            ]);
        }
    }

    private function storeIcon(TipoVehiculo $tipoVehiculo, $file): string
    {
        $path = sprintf(
            'horometros/tipos-registro/%s-%s/icono-%s.png',
            $tipoVehiculo->id,
            Str::slug($tipoVehiculo->nombre),
            now()->format('YmdHis'),
        );

        Storage::disk(config('filesystems.evidence_disk', 'public'))->put($path, file_get_contents($file->getRealPath()));

        return $path;
    }
}
