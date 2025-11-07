# Redde Bookmark (Astro + Firebase + MV3)
App web mínima para administrar marcadores (bookmarks) con colecciones, etiquetas, SSO (Google/GitHub), y una extensión de navegador.

## Stack
- **Astro** (islands con React)
- **Firebase**: Auth, Firestore, Storage, Functions
- **Extensión Chrome** (Manifest V3)

## Requisitos
- Node.js 18+ (recomendado 20)
- Firebase CLI (`npm i -g firebase-tools`)
- Una cuenta de Firebase con proyecto creado

## Setup rápido
```bash
git clone <tu-repo>.git
cd redde-bookmark

# Web (Astro)
cd apps/web
cp .env.example .env
npm i
npm run dev

# En otra terminal, para emuladores y funciones (opcional al inicio)
cd ../../functions
npm i
npm run build
# firebase emulators:start  (si usas emuladores)

# Deploy (Hosting + Functions + rules + indexes)
cd ..
firebase login
firebase use <tu-project-id>
npm run deploy
```

## Variables de entorno (Astro)
Crea `apps/web/.env`:
```
PUBLIC_FB_API_KEY=
PUBLIC_FB_AUTH_DOMAIN=
PUBLIC_FB_PROJECT_ID=
PUBLIC_FB_STORAGE_BUCKET=
PUBLIC_FB_APP_ID=
```

## Firebase
Ajusta `.firebaserc` con tu `projectId`:
```json
{
  "projects": { "default": "TU_PROJECT_ID" }
}
```

## Extensión Chrome (MV3)
1. Abre `chrome://extensions` → **Load unpacked** → selecciona `apps/extension/`.
2. Edita `popup.js` y reemplaza `https://TU_DOMINIO` por tu dominio desplegado (o `http://localhost:4321`).

## Notas
- El MVP crea y lista bookmarks. La función de metadatos (`fetchMetadata`) está incluida para habilitarse luego (Cloud Functions); por defecto el formulario usa placeholder.
- Reglas y índices para Firestore incluidas. Revisa y ajusta según tus necesidades.

---

## Despliegue

### Opción 1: Cloudflare Pages (Recomendado para hosting estático)

El proyecto está configurado para desplegarse en Cloudflare Pages. Ver guía completa en [DEPLOYMENT.md](DEPLOYMENT.md).

**Quick Start:**
```bash
cd apps/web
npm run deploy  # Deploy manual con Wrangler CLI
```

O conecta tu repositorio Git a Cloudflare Pages con estas configuraciones:
- **Build command**: `npm run build`
- **Build output directory**: `apps/web/dist`
- **Environment variables**: Ver [DEPLOYMENT.md](DEPLOYMENT.md)

### Opción 2: Firebase Hosting

Incluye `.github/workflows/firebase-deploy.yml` que despliega automáticamente a Firebase al hacer push a `main`.

**Secrets requeridos:**
- `FIREBASE_PROJECT_ID`: ID del proyecto Firebase (p.ej. `redde-prod`)
- `FIREBASE_TOKEN`: Token de Firebase CLI (genera con `firebase login:ci`)

> Alternativa: puedes usar Workload Identity/Service Account con `google-github-actions/auth`, pero el flujo anterior es el más simple para arrancar.

## Importar / Exportar por CLI (Admin SDK)
Instala dependencias en la raíz:
```bash
npm i
```

### Importar (Netscape o JSON)
```bash
# Autenticación: exporta GOOGLE_APPLICATION_CREDENTIALS con la ruta a tu Service Account JSON
export GOOGLE_APPLICATION_CREDENTIALS=/ruta/service-account.json
# o exporta FIREBASE_SERVICE_ACCOUNT_JSON con el contenido del JSON

# Netscape HTML
node tools/import-bookmarks.mjs --uid <USER_ID> --file ./bookmarks.html --format netscape --project TU_PROJECT_ID

# JSON (estructura { items: [...] } o array simple)
node tools/import-bookmarks.mjs --uid <USER_ID> --file ./bookmarks.json --format json --project TU_PROJECT_ID
```

### Exportar
```bash
node tools/export-bookmarks.mjs --uid <USER_ID> --format json --out export.json --project TU_PROJECT_ID

node tools/export-bookmarks.mjs --uid <USER_ID> --format netscape --out export.html --project TU_PROJECT_ID
```
