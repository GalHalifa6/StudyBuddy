import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'light' | 'dark';

export type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentMuted: string;
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  border: string;
  borderLight: string;
  tabBar: string;
  cardShadow: string;
  // Gradient stops for LinearGradient components
  gradientStart: string;
  gradientEnd: string;
  heroGradientStart: string;
  heroGradientMid: string;
  heroGradientEnd: string;
};

const lightPalette: Palette = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  surfaceElevated: '#E2E8F0',
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#EEF2FF',
  accent: '#EC4899',
  accentMuted: '#FBCFE8',
  secondary: '#8B5CF6',
  secondaryDark: '#7C3AED',
  secondaryLight: '#EDE9FE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  tabBar: '#FFFFFF',
  cardShadow: 'rgba(15, 23, 42, 0.08)',
  gradientStart: '#6366F1',
  gradientEnd: '#8B5CF6',
  heroGradientStart: '#4F46E5',
  heroGradientMid: '#6366F1',
  heroGradientEnd: '#7C3AED',
};

const darkPalette: Palette = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#334155',
  surfaceElevated: '#475569',
  primary: '#818CF8',
  primaryDark: '#6366F1',
  primaryLight: '#312E81',
  accent: '#F472B6',
  accentMuted: '#831843',
  secondary: '#A78BFA',
  secondaryDark: '#8B5CF6',
  secondaryLight: '#4C1D95',
  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  warningLight: '#78350F',
  error: '#F87171',
  errorLight: '#7F1D1D',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  textOnPrimary: '#FFFFFF',
  border: '#334155',
  borderLight: '#1E293B',
  tabBar: '#0F172A',
  cardShadow: 'rgba(0, 0, 0, 0.4)',
  gradientStart: '#6366F1',
  gradientEnd: '#8B5CF6',
  heroGradientStart: '#1E1B4B',
  heroGradientMid: '#312E81',
  heroGradientEnd: '#1E3A5F',
};

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: Palette;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_PREF_KEY = 'studybuddy_theme_pref';

const resolvePalette = (mode: ThemeMode): Palette => (mode === 'dark' ? darkPalette : lightPalette);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(systemScheme === 'dark' ? 'dark' : 'light');
  const [hydrated, setHydrated] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);

  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      try {
        const stored = await SecureStore.getItemAsync(THEME_PREF_KEY);
        if (stored === 'light' || stored === 'dark') {
          if (mounted) {
            setModeState(stored);
            setManualOverride(true);
          }
        } else if (systemScheme === 'dark') {
          setModeState('dark');
        }
      } catch (error) {
        console.warn('Failed to load theme preference', error);
      } finally {
        if (mounted) {
          setHydrated(true);
        }
      }
    };

    hydrate();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (!colorScheme || manualOverride) {
        return;
      }
      setModeState(colorScheme === 'dark' ? 'dark' : 'light');
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [manualOverride, systemScheme]);

  const persistPreference = useCallback(async (next: ThemeMode | null) => {
    try {
      if (next) {
        await SecureStore.setItemAsync(THEME_PREF_KEY, next);
      } else {
        await SecureStore.deleteItemAsync(THEME_PREF_KEY);
      }
    } catch (error) {
      console.warn('Failed to persist theme preference', error);
    }
  }, []);

  const setMode = useCallback(
    async (next: ThemeMode) => {
      setModeState(next);
      setManualOverride(true);
      await persistPreference(next);
    },
    [persistPreference]
  );

  const toggleTheme = useCallback(() => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next).catch(() => null);
  }, [mode, setMode]);

  const colors = useMemo(() => resolvePalette(mode), [mode]);
  const isDark = mode === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, isDark, colors, toggleTheme, setMode }),
    [mode, isDark, colors, toggleTheme, setMode]
  );

  if (!hydrated) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};

export const getPalette = resolvePalette;