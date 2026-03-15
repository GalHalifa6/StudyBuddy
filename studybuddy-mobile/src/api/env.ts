import Constants from 'expo-constants';

type ExtraEnv = {
  EXPO_PUBLIC_API_BASE_URL?: string;
  USE_MOCKS?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraEnv;

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.EXPO_PUBLIC_API_BASE_URL ?? '';

const normalizeBaseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  return withoutTrailingSlash.endsWith('/api') ? withoutTrailingSlash : `${withoutTrailingSlash}/api`;
};

export const API_BASE_URL = normalizeBaseUrl(rawBaseUrl);

export const USE_MOCKS = (process.env.USE_MOCKS ?? extra.USE_MOCKS ?? 'false').toLowerCase() === 'true';
