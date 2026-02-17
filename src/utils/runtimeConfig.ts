// runtimeConfig.ts
// Small runtime configuration helpers for asset base URL and dev start scene.

export function getAssetBaseUrl(): string {
  // Use Vite env var when provided. During development, default to the dev server used today.
  const env = (import.meta as any).env ?? {};
  const configured = env.VITE_ASSET_BASE_URL;
  if (configured !== undefined && configured !== null) return configured;

  // Default behavior:
  // - DEV: use the local static server used previously
  // - PROD: use relative paths so packaged Electron uses local files
  return (env.MODE === 'development' || env.DEV) ? 'http://localhost:8080/static/' : '';
}

export function getDevStartScene(): string | null {
  const env = (import.meta as any).env ?? {};
  return env.VITE_DEV_START_SCENE ?? null;
}
