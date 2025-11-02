import * as https from 'firebase-functions/v2/https';
import * as firestore from 'firebase-functions/v2/firestore';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import * as admin from 'firebase-admin';

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Función callable para obtener metadata de una URL
 */
export const fetchMetadata = https.onCall<{ url: string }>(async (req) => {
  const url = req.data?.url;
  if (!url) throw new https.HttpsError('invalid-argument', 'url requerida');

  try {
    const res = await fetch(url, {
      redirect: 'follow' as any,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    // Extraer metadata
    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || url;
    const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const favicon = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || '/favicon.ico';

    let absoluteFavicon = '';
    try {
      absoluteFavicon = new URL(favicon, url).toString();
    } catch {
      const urlObj = new URL(url);
      absoluteFavicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    }

    // Generar screenshot usando servicio público (alternativa a Puppeteer)
    const urlObj = new URL(url);
    const screenshotUrl = `https://image.thum.io/get/width/800/crop/600/${encodeURIComponent(url)}`;

    return {
      title: title.trim(),
      description: description.trim(),
      faviconUrl: absoluteFavicon,
      screenshotUrl: screenshotUrl,
      ogImage: ogImage
    };
  } catch (error: any) {
    console.error('Error fetching metadata:', error);
    throw new https.HttpsError('internal', `Error al obtener metadata: ${error.message}`);
  }
});

/**
 * Trigger que enriquece automáticamente los bookmarks cuando se crean
 */
export const enrichBookmark = firestore.onDocumentCreated(
  'users/{uid}/bookmarks/{bookmarkId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const { url, title, description, faviconUrl, screenshotUrl } = data;

    // Si ya tiene metadata completa, no hacer nada
    if (title && title !== url && description && faviconUrl && screenshotUrl) {
      return;
    }

    try {
      // Obtener metadata
      const res = await fetch(url, {
        redirect: 'follow' as any,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      } as any);

      const html = await res.text();
      const $ = cheerio.load(html);

      // Extraer metadata
      const metaTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || title;
      const metaDescription = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
      const favicon = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || '/favicon.ico';

      let absoluteFavicon = faviconUrl;
      if (!faviconUrl) {
        try {
          absoluteFavicon = new URL(favicon, url).toString();
        } catch {
          const urlObj = new URL(url);
          absoluteFavicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
        }
      }

      // Generar screenshot URL
      const newScreenshotUrl = screenshotUrl || `https://image.thum.io/get/width/800/crop/600/${encodeURIComponent(url)}`;

      // Actualizar el bookmark
      await snapshot.ref.update({
        title: metaTitle.trim() || title,
        description: metaDescription.trim(),
        faviconUrl: absoluteFavicon,
        screenshotUrl: newScreenshotUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Bookmark enriched: ${snapshot.id}`);
    } catch (error: any) {
      console.error(`Error enriching bookmark ${snapshot.id}:`, error.message);
      // No lanzar error para evitar que falle el trigger
    }
  }
);
