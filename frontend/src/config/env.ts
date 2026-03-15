const trimTrailingSlash = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const normalizeSockJsBase = (value?: string | null): string | undefined => {
  const trimmed = trimTrailingSlash(value);
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('ws://')) {
    return `http://${trimmed.slice(5)}`;
  }

  if (trimmed.startsWith('wss://')) {
    return `https://${trimmed.slice(6)}`;
  }

  return trimmed;
};

const rawApiBase = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? undefined);
const rawWsBase = trimTrailingSlash(import.meta.env.VITE_WS_BASE_URL ?? undefined);
const rawSockJsBase = normalizeSockJsBase(import.meta.env.VITE_WS_BASE_URL ?? undefined) ?? rawApiBase;

export const API_BASE_URL = rawApiBase;
export const WS_BASE_URL = rawWsBase;
export const SOCKJS_BASE_URL = rawSockJsBase;

export const apiBaseWithPrefix = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

export const resolveApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL) {
    return `${API_BASE_URL}${normalizedPath}`;
  }
  return normalizedPath;
};

export const resolveWsUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (WS_BASE_URL) {
    return `${WS_BASE_URL}${normalizedPath}`;
  }
  return `${window.location.origin}${normalizedPath}`;
};

export const resolveSockJsUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (SOCKJS_BASE_URL) {
    return `${SOCKJS_BASE_URL}${normalizedPath}`;
  }
  return `${window.location.origin}${normalizedPath}`;
};
