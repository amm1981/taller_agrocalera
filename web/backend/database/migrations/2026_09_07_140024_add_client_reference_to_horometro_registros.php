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
            $table->string('client_reference', 100)->nullable()->unique();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('horometro_registros', function (Blueprint $table) {
            $table->dropUnique(['client_reference']);
            $table->dropColumn('client_reference');
        });
    }
};
