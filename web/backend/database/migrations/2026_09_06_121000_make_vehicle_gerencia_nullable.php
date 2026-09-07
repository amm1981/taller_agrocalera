<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('vehiculos', function (Blueprint $table) {
            $table->foreignId('gerencia_id')->nullable()->change();
        });

        DB::table('vehiculos')->update(['gerencia_id' => null]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $gerenciaId = DB::table('gerencias')->value('id');

        if ($gerenciaId !== null) {
            DB::table('vehiculos')
                ->whereNull('gerencia_id')
                ->update(['gerencia_id' => $gerenciaId]);
        }

        Schema::table('vehiculos', function (Blueprint $table) {
            $table->foreignId('gerencia_id')->nullable(false)->change();
        });
    }
};
