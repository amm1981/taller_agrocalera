<?php

namespace Tests\Feature;

use App\Models\AppVersion;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AppVersionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_current_version_returns_null_when_not_configured(): void
    {
        $this
            ->getJson('/api/app/version')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_admin_can_publish_apk_version_to_storage(): void
    {
        $this->seed(DatabaseSeeder::class);
        Storage::fake('public');
        config(['filesystems.evidence_disk' => 'public']);

        $this
            ->withToken($this->adminToken())
            ->post('/api/app-versiones', [
                'version_code' => 2,
                'version_name' => '1.0.1',
                'message' => 'Mejoras de sincronizacion.',
                'required' => true,
                'apk' => UploadedFile::fake()->create('agrocontrol-1.0.1.apk', 512, 'application/vnd.android.package-archive'),
            ])
            ->assertCreated()
            ->assertJsonPath('data.version_code', 2)
            ->assertJsonPath('data.version_name', '1.0.1')
            ->assertJsonPath('data.required', true)
            ->assertJsonPath('data.message', 'Mejoras de sincronizacion.');

        $version = AppVersion::query()->firstOrFail();
        $this->assertStringStartsWith('apk/updates/', $version->apk_path);
        Storage::disk('public')->assertExists($version->apk_path);

        $this
            ->getJson('/api/app/version')
            ->assertOk()
            ->assertJsonPath('data.version_code', 2)
            ->assertJsonPath('data.required', true);
    }

    private function adminToken(): string
    {
        return User::where('email', 'admin@agrocontrol.local')
            ->firstOrFail()
            ->createToken('feature-test')
            ->plainTextToken;
    }
}
