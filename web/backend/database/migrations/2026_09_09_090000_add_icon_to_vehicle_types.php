<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tipos_vehiculo', function (Blueprint $table) {
            if (! Schema::hasColumn('tipos_vehiculo', 'icono_path')) {
                $table->string('icono_path')->nullable()->after('estado');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tipos_vehiculo', function (Blueprint $table) {
            if (Schema::hasColumn('tipos_vehiculo', 'icono_path')) {
                $table->dropColumn('icono_path');
            }
        });
    }
};
