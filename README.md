# taller_agrocalera

Sistema web y aplicativo Android para Taller AgroCalera y control de horómetros.

## Producción

Dominio público previsto:

```text
https://taller.agrocalera.app
```

API prevista:

```text
https://taller.agrocalera.app/api
```

## Backend Laravel

Configurar `web/backend/.env` en el servidor usando `web/backend/.env.example` como base:

```text
APP_ENV=production
APP_DEBUG=false
APP_URL=https://taller.agrocalera.app
CORS_ALLOWED_ORIGINS=https://taller.agrocalera.app
HOROMETRO_EVIDENCE_DISK=s3
```

Luego ejecutar:

```bash
cd web/backend
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Frontend React

Configurar `web/frontend/.env`:

```text
VITE_API_URL=https://taller.agrocalera.app/api
```

Luego ejecutar:

```bash
cd web/frontend
npm ci
npm run build
```

Publicar `web/frontend/dist` como frontend del dominio y redirigir `/api` al backend Laravel.

## App Android

La app de horómetros usa por defecto:

```text
https://taller.agrocalera.app/api
```

En desarrollo puede apuntarse temporalmente a una IP local desde el campo `API` de la pantalla principal.
