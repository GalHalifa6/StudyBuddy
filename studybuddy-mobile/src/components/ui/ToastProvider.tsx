import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

type ToastType = 'success' | 'error' | 'info';

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
};

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useAppTheme();
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', visible: false });
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const hideToast = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }

    Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setToast(prev => ({ ...prev, visible: false }));
    });
  }, [opacity]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }

      setToast({ message, type, visible: true });

      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      hideTimeout.current = setTimeout(() => hideToast(), 3500);
    },
    [hideToast, opacity]
  );

  useEffect(() => () => hideTimeout.current && clearTimeout(hideTimeout.current), []);

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  const backgroundColor =
    toast.type === 'success' ? colors.success : toast.type === 'error' ? colors.error : colors.surfaceAlt;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast.visible ? (
        <Animated.View style={[styles.container, { opacity }]}>
          <View style={[styles.toast, { backgroundColor }]}>
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: spacing.xl,
      alignItems: 'center',
      zIndex: 1000,
    },
    toast: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 12,
      maxWidth: '90%',
      shadowColor: colors.cardShadow,
      shadowOpacity: 0.3,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 4,
    },
    text: {
      color: colors.textPrimary,
      fontSize: 15,
      textAlign: 'center',
      fontWeight: '600',
    },
  });
