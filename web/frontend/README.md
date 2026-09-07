# AgroControl Web

Web administrativa de AgroControl construida con React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query y React Router.

## Instalación

```bash
npm install
```

## Variables de entorno

Crear `.env` a partir de `.env.example` cuando se necesite cambiar la URL del API.

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

## Scripts

```bash
npm run dev
npm run build
```

## Acceso local

La web usa `POST /api/auth/login` y guarda el token Bearer en almacenamiento local del navegador.

Usuario inicial de desarrollo:

```text
admin@agrocontrol.local
```

## Estructura

```text
src/
├── api/
├── components/
├── features/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── schemas/
├── services/
├── types/
└── utils/
```
