<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('horometro_registros', function (Blueprint $table) {
            $table->foreignId('sector_id')
                ->nullable()
                ->after('fundo_id')
                ->constrained('sectores')
                ->nullOnDelete();

            $table->index('sector_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('horometro_registros', function (Blueprint $table) {
            $table->dropIndex(['sector_id']);
            $table->dropConstrainedForeignId('sector_id');
        });
    }
};
