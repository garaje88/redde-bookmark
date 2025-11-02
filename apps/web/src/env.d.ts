/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly PUBLIC_FB_API_KEY: string;
  readonly PUBLIC_FB_AUTH_DOMAIN: string;
  readonly PUBLIC_FB_PROJECT_ID: string;
  readonly PUBLIC_FB_STORAGE_BUCKET: string;
  readonly PUBLIC_FB_APP_ID: string;
}
interface ImportMeta { env: ImportMetaEnv }
