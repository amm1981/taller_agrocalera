<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 80)->nullable()->unique()->after('id');
        });

        DB::table('users')
            ->select(['id', 'email', 'dni', 'name'])
            ->orderBy('id')
            ->get()
            ->each(function (object $user): void {
                $base = $user->dni ?: Str::before($user->email ?: $user->name, '@');
                $username = Str::of($base)->lower()->replaceMatches('/[^a-z0-9._-]+/', '.')->trim('.')->toString();

                if ($username === '') {
                    $username = "usuario{$user->id}";
                }

                $candidate = $username;
                $suffix = 1;

                while (DB::table('users')->where('username', $candidate)->where('id', '!=', $user->id)->exists()) {
                    $candidate = "{$username}{$suffix}";
                    $suffix++;
                }

                DB::table('users')->where('id', $user->id)->update(['username' => $candidate]);
            });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn('username');
        });
    }
};
