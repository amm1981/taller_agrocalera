<?php

namespace App\Http\Controllers\Api\Concerns;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

trait FormatsApiPagination
{
    protected function paginated(LengthAwarePaginator $paginator): array
    {
        return [
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    protected function perPage(int $default = 20): int
    {
        return min(max((int) request('per_page', $default), 1), 100);
    }
}
