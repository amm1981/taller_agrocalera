# AgroControl API

Backend REST de AgroControl construido con Laravel 13, PHP 8.3, Sanctum y Spatie Laravel Permission.

## Instalación

```bash
composer install
php artisan key:generate
```

## Variables de entorno

El entorno local usa PostgreSQL. Mantener credenciales solo en `.env`.

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=agrocontrol
DB_USERNAME=admin
DB_PASSWORD=
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
APP_TIMEZONE=America/Lima
```

## Migraciones

```bash
php artisan migrate
php artisan db:seed
```

El seeder inicial crea roles, permisos, catálogos base, vehículos de prueba y el usuario `admin@agrocontrol.local`.

## API

```http
GET /api/health
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

Respuesta de salud:

```json
{
  "status": "ok",
  "service": "agrocontrol-api"
}
```

`POST /api/auth/login` recibe `email`, `password` y opcionalmente `device_name`. Devuelve token Bearer, usuario, roles y permisos.

### Maestros

Todos requieren token Bearer.

```http
GET    /api/gerencias
POST   /api/gerencias
PUT    /api/gerencias/{id}
GET    /api/sedes
POST   /api/sedes
PUT    /api/sedes/{id}
GET    /api/fundos
POST   /api/fundos
PUT    /api/fundos/{id}
GET    /api/sectores
POST   /api/sectores
PUT    /api/sectores/{id}
GET    /api/lotes
POST   /api/lotes
PUT    /api/lotes/{id}
GET    /api/tipos-vehiculo
POST   /api/tipos-vehiculo
PUT    /api/tipos-vehiculo/{id}
GET    /api/tipos-falla
POST   /api/tipos-falla
PUT    /api/tipos-falla/{id}
GET    /api/vehiculos
GET    /api/vehiculos/{id}
POST   /api/vehiculos
PUT    /api/vehiculos/{id}
GET    /api/personal
POST   /api/personal
PUT    /api/personal/{id}
GET    /api/usuarios
GET    /api/usuarios/{id}
POST   /api/usuarios
PUT    /api/usuarios/{id}
GET    /api/roles
POST   /api/roles
PUT    /api/roles/{id}
GET    /api/permisos
```

Los listados devuelven:

```json
{
  "data": [],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 20,
    "total": 0
  }
}
```

### Taller

Todos requieren token Bearer y permisos del grupo `taller.*`.

```http
GET  /api/taller/dashboard
GET  /api/taller/ordenes
POST /api/taller/ordenes
GET  /api/taller/ordenes/{id}
POST /api/taller/ordenes/{id}/tomar
POST /api/taller/ordenes/{id}/iniciar
POST /api/taller/ordenes/{id}/guardar-avance
POST /api/taller/ordenes/{id}/finalizar

GET  /api/taller/repuestos
POST /api/taller/ordenes/{id}/repuestos
PUT  /api/taller/repuestos/{id}
POST /api/taller/repuestos/{id}/marcar-disponible
POST /api/taller/repuestos/{id}/confirmar-recojo

GET  /api/taller/backlog
POST /api/taller/backlog/{id}/resolver

GET  /api/taller/reportes/ordenes
GET  /api/taller/reportes/tiempos
GET  /api/taller/reportes/equipos
GET  /api/taller/reportes/tecnicos
GET  /api/taller/reportes/backlog
```

Las transiciones de órdenes registran eventos automáticos en `orden_trabajo_eventos`.

### Horómetros

Todos requieren token Bearer y permisos del grupo `horometros.*`.

```http
GET  /api/horometros/dashboard
GET  /api/horometros/registros
GET  /api/horometros/registros/{id}
POST /api/horometros/inicio
POST /api/horometros/{id}/cierre
GET  /api/horometros/pendientes
GET  /api/horometros/validaciones
POST /api/horometros/{id}/reabrir
POST /api/horometros/{id}/anular
GET  /api/horometros/reportes
```

Reglas implementadas:

- Inicio entre 07:00 y 08:00, salvo reapertura.
- Cierre hasta 19:30, salvo reapertura.
- Registro único por vehículo y fecha.
- Continuidad entre cierre anterior e inicio actual.
- Horómetro final mayor o igual al inicial.
- Cálculo automático de horas trabajadas.

## Pruebas

```bash
php artisan test
php artisan route:list
```
