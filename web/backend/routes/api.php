<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Horometros\ConfiguracionController as HorometrosConfiguracionController;
use App\Http\Controllers\Api\Horometros\DashboardController as HorometrosDashboardController;
use App\Http\Controllers\Api\Horometros\ReaperturaController as HorometrosReaperturaController;
use App\Http\Controllers\Api\Horometros\RegistroController as HorometrosRegistroController;
use App\Http\Controllers\Api\Horometros\ReporteController as HorometrosReporteController;
use App\Http\Controllers\Api\Maestros\CatalogController;
use App\Http\Controllers\Api\Maestros\PersonalController;
use App\Http\Controllers\Api\Maestros\VehiculoController;
use App\Http\Controllers\Api\Taller\BacklogController;
use App\Http\Controllers\Api\Taller\DashboardController as TallerDashboardController;
use App\Http\Controllers\Api\Taller\OrdenTrabajoController;
use App\Http\Controllers\Api\Taller\PreventivoController;
use App\Http\Controllers\Api\Taller\ReporteController as TallerReporteController;
use App\Http\Controllers\Api\Taller\RepuestoController;
use App\Http\Controllers\Api\Usuarios\RolePermissionController;
use App\Http\Controllers\Api\Usuarios\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => [
    'status' => 'ok',
    'service' => 'agrocontrol-api',
]);

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::middleware('permission:maestros.ver')->group(function () {
        Route::get('/gerencias', [CatalogController::class, 'indexGerencias']);
        Route::get('/sedes', [CatalogController::class, 'indexSedes']);
        Route::get('/fundos', [CatalogController::class, 'indexFundos']);
        Route::get('/sectores', [CatalogController::class, 'indexSectores']);
        Route::get('/lotes', [CatalogController::class, 'indexLotes']);
        Route::get('/tipos-vehiculo', [CatalogController::class, 'indexTiposVehiculo']);
        Route::get('/tipos-falla', [CatalogController::class, 'indexTiposFalla']);
        Route::get('/vehiculos', [VehiculoController::class, 'index']);
        Route::get('/importaciones/vehiculos/plantilla', [VehiculoController::class, 'importTemplate']);
        Route::get('/vehiculos/{vehiculo}/trazabilidad', [VehiculoController::class, 'trazabilidad']);
        Route::get('/vehiculos/{vehiculo}/puntos-medida', [VehiculoController::class, 'measurementPointHistory']);
        Route::get('/vehiculos/{vehiculo}', [VehiculoController::class, 'show']);
        Route::get('/personal', [PersonalController::class, 'index']);
        Route::get('/importaciones/personal/plantilla', [PersonalController::class, 'importTemplate']);
    });

    Route::middleware('permission:maestros.crear')->group(function () {
        Route::post('/gerencias', [CatalogController::class, 'storeGerencia']);
        Route::post('/sedes', [CatalogController::class, 'storeSede']);
        Route::post('/fundos', [CatalogController::class, 'storeFundo']);
        Route::post('/sectores', [CatalogController::class, 'storeSector']);
        Route::post('/lotes', [CatalogController::class, 'storeLote']);
        Route::post('/importaciones/vehiculos', [VehiculoController::class, 'bulkImport']);
        Route::post('/importaciones/personal', [PersonalController::class, 'bulkImport']);
        Route::post('/tipos-vehiculo', [CatalogController::class, 'storeTipoVehiculo']);
        Route::post('/tipos-falla', [CatalogController::class, 'storeTipoFalla']);
        Route::post('/vehiculos', [VehiculoController::class, 'store']);
        Route::post('/personal', [PersonalController::class, 'store']);
    });

    Route::middleware('permission:maestros.editar')->group(function () {
        Route::put('/gerencias/{gerencia}', [CatalogController::class, 'updateGerencia']);
        Route::put('/sedes/{sede}', [CatalogController::class, 'updateSede']);
        Route::put('/fundos/{fundo}', [CatalogController::class, 'updateFundo']);
        Route::put('/sectores/{sector}', [CatalogController::class, 'updateSector']);
        Route::put('/lotes/{lote}', [CatalogController::class, 'updateLote']);
        Route::put('/tipos-vehiculo/{tipoVehiculo}', [CatalogController::class, 'updateTipoVehiculo']);
        Route::put('/tipos-falla/{tipoFalla}', [CatalogController::class, 'updateTipoFalla']);
        Route::put('/vehiculos/{vehiculo}', [VehiculoController::class, 'update']);
        Route::put('/personal/{personal}', [PersonalController::class, 'update']);
    });

    Route::middleware('permission:maestros.editar')->delete('/vehiculos', [VehiculoController::class, 'destroyMany']);
    Route::middleware('permission:maestros.editar')->delete('/vehiculos/{vehiculo}', [VehiculoController::class, 'destroy']);

    Route::middleware('permission:usuarios.ver')->group(function () {
        Route::get('/usuarios', [UserController::class, 'index']);
        Route::get('/usuarios/{usuario}', [UserController::class, 'show']);
    });

    Route::middleware('permission:usuarios.crear')->post('/usuarios', [UserController::class, 'store']);
    Route::middleware('permission:usuarios.editar')->put('/usuarios/{usuario}', [UserController::class, 'update']);

    Route::middleware('permission:usuarios.permisos')->group(function () {
        Route::get('/roles', [RolePermissionController::class, 'roles']);
        Route::post('/roles', [RolePermissionController::class, 'storeRole']);
        Route::put('/roles/{role}', [RolePermissionController::class, 'updateRole']);
        Route::get('/permisos', [RolePermissionController::class, 'permissions']);
        Route::get('/permissions', [RolePermissionController::class, 'permissions']);
    });

    Route::prefix('taller')->group(function () {
        Route::middleware('permission:taller.ver')->group(function () {
            Route::get('/dashboard', TallerDashboardController::class);
            Route::get('/ordenes', [OrdenTrabajoController::class, 'index']);
            Route::get('/ordenes/{orden}', [OrdenTrabajoController::class, 'show']);
            Route::get('/preventivos', [PreventivoController::class, 'index']);
            Route::get('/reportes/ordenes', [OrdenTrabajoController::class, 'index']);
            Route::get('/reportes/tiempos', [TallerReporteController::class, 'tiempos']);
            Route::get('/reportes/equipos', [TallerReporteController::class, 'equipos']);
            Route::get('/reportes/tecnicos', [TallerReporteController::class, 'tecnicos']);
            Route::get('/reportes/backlog', [TallerReporteController::class, 'backlog']);
        });

        Route::middleware('permission:taller.crear')->post('/ordenes', [OrdenTrabajoController::class, 'store']);

        Route::middleware('permission:taller.editar')->group(function () {
            Route::post('/ordenes/{orden}/tomar', [OrdenTrabajoController::class, 'tomar']);
            Route::post('/ordenes/{orden}/iniciar', [OrdenTrabajoController::class, 'iniciar']);
            Route::post('/ordenes/{orden}/guardar-avance', [OrdenTrabajoController::class, 'guardarAvance']);
        });

        Route::middleware('permission:taller.finalizar')->post('/ordenes/{orden}/finalizar', [OrdenTrabajoController::class, 'finalizar']);

        Route::middleware('permission:taller.repuestos.ver')->get('/repuestos', [RepuestoController::class, 'index']);
        Route::middleware('permission:taller.repuestos.gestionar')->group(function () {
            Route::post('/ordenes/{orden}/repuestos', [RepuestoController::class, 'store']);
            Route::put('/repuestos/{repuesto}', [RepuestoController::class, 'update']);
            Route::post('/repuestos/{repuesto}/marcar-disponible', [RepuestoController::class, 'marcarDisponible']);
            Route::post('/repuestos/{repuesto}/confirmar-recojo', [RepuestoController::class, 'confirmarRecojo']);
        });

        Route::middleware('permission:taller.backlog.ver')->get('/backlog', [BacklogController::class, 'index']);
        Route::middleware('permission:taller.finalizar')->post('/backlog/{orden}/resolver', [BacklogController::class, 'resolver']);
    });

    Route::prefix('horometros')->group(function () {
        Route::middleware('permission:horometros.ver')->group(function () {
            Route::get('/dashboard', HorometrosDashboardController::class);
            Route::get('/registros', [HorometrosRegistroController::class, 'index']);
            Route::get('/registros/export', [HorometrosRegistroController::class, 'export']);
            Route::get('/registros/{registro}', [HorometrosRegistroController::class, 'show']);
            Route::delete('/registros/{registro}', [HorometrosRegistroController::class, 'destroy']);
            Route::get('/pendientes', [HorometrosRegistroController::class, 'pendientes']);
            Route::get('/validaciones', [HorometrosRegistroController::class, 'validaciones']);
            Route::get('/reaperturas', [HorometrosReaperturaController::class, 'index']);
            Route::get('/configuracion', [HorometrosConfiguracionController::class, 'show']);
        });

        Route::middleware('permission:horometros.registrar')->group(function () {
            Route::post('/inicio', [HorometrosRegistroController::class, 'inicio']);
            Route::post('/{registro}/cierre', [HorometrosRegistroController::class, 'cierre']);
        });

        Route::middleware('permission:horometros.reabrir')->group(function () {
            Route::post('/reaperturas', [HorometrosReaperturaController::class, 'store']);
            Route::post('/{registro}/reabrir', [HorometrosRegistroController::class, 'reabrir']);
        });
        Route::middleware('permission:horometros.validar')->post('/{registro}/anular', [HorometrosRegistroController::class, 'anular']);
        Route::middleware('permission:horometros.validar')->put('/configuracion', [HorometrosConfiguracionController::class, 'update']);
        Route::middleware('permission:horometros.reportes.ver')->get('/reportes', HorometrosReporteController::class);
    });
});
