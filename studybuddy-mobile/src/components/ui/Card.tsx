import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { spacing, borderRadius } from '../../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  onPress?: () => void;
  style?: ViewStyle;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  onPress,
  style,
  padding = 'md',
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const paddingStyles = {
    none: {},
    sm: { padding: spacing.sm },
    md: { padding: spacing.md },
    lg: { padding: spacing.lg },
  };

  const variantStyles = {
    default: styles.default,
    elevated: styles.elevated,
    outlined: styles.outlined,
    gradient: {},
  };

  if (variant === 'gradient') {
    const content = (
      <LinearGradient
        colors={[colors.heroGradientStart, colors.heroGradientMid, colors.heroGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, styles.gradient, paddingStyles[padding], style]}
      >
        {children}
      </LinearGradient>
    );

    if (onPress) {
      return (
        <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [pressed && styles.pressed]}>
          {content}
        </Pressable>
      );
    }
    return content;
  }

  const content = (
    <View style={[styles.base, variantStyles[variant], paddingStyles[padding], style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return content;
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    base: {
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
    },
    default: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    elevated: {
      backgroundColor: colors.surface,
      shadowColor: colors.cardShadow,
      shadowOpacity: 1,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 20,
      elevation: 5,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    gradient: {
      shadowColor: colors.primary,
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 24,
      elevation: 8,
    },
    pressed: {
      opacity: 0.92,
      transform: [{ scale: 0.98 }],
    },
  });
