<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehiculos', function (Blueprint $table) {
            $table->string('punto_medida')->nullable()->after('modelo');
            $table->date('punto_medida_vigente_desde')->nullable()->after('punto_medida');
        });
    }

    public function down(): void
    {
        Schema::table('vehiculos', function (Blueprint $table) {
            $table->dropColumn(['punto_medida', 'punto_medida_vigente_desde']);
        });
    }
};
