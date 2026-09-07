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
            $table->foreignId('fundo_id')
                ->nullable()
                ->after('usuario_responsable_id')
                ->constrained('fundos')
                ->nullOnDelete();
            $table->foreignId('lote_id')
                ->nullable()
                ->after('fundo_id')
                ->constrained('lotes')
                ->nullOnDelete();

            $table->index(['fundo_id', 'lote_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('horometro_registros', function (Blueprint $table) {
            $table->dropIndex(['fundo_id', 'lote_id']);
            $table->dropConstrainedForeignId('lote_id');
            $table->dropConstrainedForeignId('fundo_id');
        });
    }
};
