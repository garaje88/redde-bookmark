# Assets Structure

Esta carpeta contiene todos los recursos estáticos del proyecto (iconos, logos, imágenes).

## Estructura de Carpetas

```
public/assets/
├── icons/          # Iconos del sitio (favicon, PWA icons, etc.)
├── logos/          # Logos de la aplicación
└── README.md       # Este archivo
```

## Icons (`/assets/icons/`)

Contiene todos los iconos relacionados con el favicon y la aplicación PWA:

- **favicon-16x16.png** - Favicon pequeño (16x16px)
- **favicon-32x32.png** - Favicon mediano (32x32px)
- **apple-touch-icon.png** - Ícono para dispositivos Apple (180x180px)
- **android-chrome-192x192.png** - Ícono Android pequeño (192x192px)
- **android-chrome-512x512.png** - Ícono Android grande (512x512px)

### Favicon raíz

- **favicon.ico** - Ubicado en `/public/favicon.ico` para compatibilidad con navegadores antiguos

## Logos (`/assets/logos/`)

Esta carpeta está reservada para logos de la aplicación en diferentes formatos y tamaños.

Ejemplo de uso:
- Logo principal (SVG preferido para escalabilidad)
- Logo en versiones light/dark
- Logo para email marketing
- Logo para redes sociales

## Uso en el Código

### En componentes Astro/React:

```tsx
// Para iconos
<img src="/assets/icons/apple-touch-icon.png" alt="Logo" />

// Para logos
<img src="/assets/logos/logo.svg" alt="Redde Bookmark" />
```

### En CSS:

```css
background-image: url('/assets/icons/android-chrome-512x512.png');
```

## PWA Manifest

El archivo `manifest.json` en la raíz de `/public/` referencia estos iconos:

```json
{
  "icons": [
    {
      "src": "/assets/icons/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/assets/icons/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## Meta Tags

Los iconos están configurados en `BaseLayout.astro`:

```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="16x16" href="/assets/icons/favicon-16x16.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32x32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/apple-touch-icon.png" />
```

## Generación de Iconos

Los iconos actuales fueron generados usando [favicon.io](https://favicon.io/).

Para generar nuevos iconos:
1. Visita https://favicon.io/
2. Crea tu diseño
3. Descarga el paquete
4. Reemplaza los archivos en `/public/assets/icons/`
5. Actualiza `manifest.json` si es necesario

## Optimización

Todos los íconos están optimizados para web:
- **PNG**: Compresión óptima manteniendo calidad
- **ICO**: Multi-resolución para compatibilidad máxima

## Notas

- Los archivos en la carpeta `public/` son servidos directamente sin procesamiento
- Las rutas en el código deben comenzar con `/` para referenciar desde la raíz
- No uses `@` o rutas relativas para assets en `public/`
