<?php

namespace App\Http\Controllers\Api\Horometros;

use App\Domain\Horometros\Services\HorometroSapReportService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SapReportController extends Controller
{
    public function __construct(private readonly HorometroSapReportService $report) {}

    public function __invoke(Request $request): JsonResponse|BinaryFileResponse
    {
        $this->authorizeToken($request);

        if ($request->query('format') === 'xlsx') {
            $path = $this->report->createSpreadsheet($request);

            return response()->download(
                $path,
                'horometros-exportable-sap-'.now()->format('Ymd-His').'.xlsx',
                ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            )->deleteFileAfterSend(true);
        }

        return response()->json([
            'generated_at' => now()->format('d/m/Y H:i:s'),
            'data' => $this->report->associativeRows($request),
        ]);
    }

    private function authorizeToken(Request $request): void
    {
        $configuredToken = config('services.horometros_sap_report.token');
        $incomingToken = $request->bearerToken();

        abort_if(! $configuredToken || ! $incomingToken || ! hash_equals($configuredToken, $incomingToken), 401, 'Token no autorizado.');
    }
}
