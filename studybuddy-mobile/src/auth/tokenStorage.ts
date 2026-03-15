import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'studybuddy_token';

let inMemoryToken: string | null = null;

export const loadInitialToken = async () => {
  if (inMemoryToken !== null) {
    return inMemoryToken;
  }

  try {
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    inMemoryToken = stored ?? null;
    return inMemoryToken;
  } catch (error) {
    console.warn('Failed to load auth token', error);
    return null;
  }
};

export const setStoredToken = async (token: string | null) => {
  inMemoryToken = token;
  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.warn('Failed to persist auth token', error);
  }
};

export const getStoredToken = () => inMemoryToken;
