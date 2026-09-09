<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class AppVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'version_code',
        'version_name',
        'message',
        'required',
        'apk_path',
        'original_filename',
        'file_size',
        'created_by',
        'published_at',
    ];

    protected $appends = [
        'download_url',
    ];

    protected function casts(): array
    {
        return [
            'required' => 'boolean',
            'published_at' => 'datetime',
            'file_size' => 'integer',
            'version_code' => 'integer',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getDownloadUrlAttribute(): ?string
    {
        if (! $this->apk_path) {
            return null;
        }

        return Storage::disk(config('filesystems.evidence_disk', 'public'))->url($this->apk_path);
    }
}
