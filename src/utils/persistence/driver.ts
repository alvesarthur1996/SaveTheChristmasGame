import { HttpPersistenceDriver } from './httpDriver';
import type { PersistenceDriver } from './types';

const DEFAULT_HTTP_BASE_URL = 'http://localhost:8080';

function isLikelyElectronRenderer(): boolean {
  // In Electron renderer you often have a user agent containing Electron.
  // We keep this conservative and allow overriding via env.
  return typeof navigator !== 'undefined' && /Electron\//i.test(navigator.userAgent);
}

export function getPersistenceDriver(): PersistenceDriver {
  // For now we still use HTTP everywhere; Electron file driver will replace this.
  // This scaffolding keeps call-sites stable.
  const baseUrl =
    (import.meta as any).env?.VITE_PERSISTENCE_HTTP_BASE_URL ?? DEFAULT_HTTP_BASE_URL;

  // Reserved for future branching when Electron driver is implemented.
  void isLikelyElectronRenderer();

  return new HttpPersistenceDriver(baseUrl);
}
