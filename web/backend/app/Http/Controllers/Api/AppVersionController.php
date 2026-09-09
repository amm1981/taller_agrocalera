<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AppVersionController extends Controller
{
    public function current(): array
    {
        $version = AppVersion::query()
            ->orderByDesc('version_code')
            ->first();

        return ['data' => $version ? $this->serialize($version) : null];
    }

    public function index(): array
    {
        $versions = AppVersion::query()
            ->with('creator:id,name,last_name,username,email')
            ->orderByDesc('version_code')
            ->paginate(12);

        return [
            'data' => $versions->getCollection()->map(fn (AppVersion $version) => $this->serialize($version))->values(),
            'meta' => [
                'current_page' => $versions->currentPage(),
                'last_page' => $versions->lastPage(),
                'per_page' => $versions->perPage(),
                'total' => $versions->total(),
            ],
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'version_code' => ['required', 'integer', 'min:1', Rule::unique('app_versions', 'version_code')],
            'version_name' => ['required', 'string', 'max:40'],
            'message' => ['nullable', 'string', 'max:1000'],
            'required' => ['required', 'boolean'],
            'apk' => ['required', 'file', 'max:204800'],
        ]);

        $file = $request->file('apk');
        $originalName = $file?->getClientOriginalName() ?? '';

        if (! Str::of($originalName)->lower()->endsWith('.apk')) {
            throw ValidationException::withMessages([
                'apk' => ['El archivo debe tener extensión .apk.'],
            ]);
        }

        $path = sprintf(
            'apk/updates/%s/agrocontrol-%s-%s.apk',
            now()->format('Y/m/d'),
            $data['version_code'],
            Str::uuid(),
        );

        $stream = fopen($file->getRealPath(), 'r');
        $stored = $stream
            ? Storage::disk(config('filesystems.evidence_disk', 'public'))->put($path, $stream)
            : false;

        if (is_resource($stream)) {
            fclose($stream);
        }

        if (! $stored) {
            throw ValidationException::withMessages([
                'apk' => ['No se pudo almacenar el APK en object storage.'],
            ]);
        }

        $version = AppVersion::query()->create([
            'version_code' => $data['version_code'],
            'version_name' => $data['version_name'],
            'message' => $data['message'] ?? null,
            'required' => $request->boolean('required'),
            'apk_path' => $path,
            'original_filename' => $originalName,
            'file_size' => $file->getSize(),
            'created_by' => $request->user()?->id,
            'published_at' => now(),
        ]);

        return response()->json(['data' => $this->serialize($version)], 201);
    }

    private function serialize(AppVersion $version): array
    {
        return [
            'id' => $version->id,
            'version_code' => $version->version_code,
            'version_name' => $version->version_name,
            'message' => $version->message,
            'required' => $version->required,
            'download_url' => $version->download_url,
            'apk_path' => $version->apk_path,
            'original_filename' => $version->original_filename,
            'file_size' => $version->file_size,
            'published_at' => $version->published_at?->toISOString(),
            'created_at' => $version->created_at?->toISOString(),
            'creator' => $version->creator ? [
                'id' => $version->creator->id,
                'name' => trim($version->creator->name.' '.($version->creator->last_name ?? '')),
                'username' => $version->creator->username,
                'email' => $version->creator->email,
            ] : null,
        ];
    }
}
