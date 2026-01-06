import React, { useMemo } from 'react';
import { ActivityIndicator, GestureResponderEvent, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { spacing, borderRadius } from '../../theme/spacing';

interface ButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode | keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  icon,
  style,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDisabled = disabled || loading;

  const sizeStyles = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  };

  const labelSizeStyles = {
    sm: styles.labelSm,
    md: styles.labelMd,
    lg: styles.labelLg,
  };

  const renderContent = () => {
    // Determine icon color based on variant
    const iconColor = variant === 'primary' ? colors.textOnPrimary : 
                      variant === 'danger' ? colors.error : 
                      variant === 'ghost' ? colors.primary : colors.textPrimary;
    
    // Render icon - handle both string (Ionicons name) and React.ReactNode
    const renderIcon = () => {
      if (!icon) return null;
      if (typeof icon === 'string') {
        return <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18} color={iconColor} />;
      }
      return icon;
    };

    return (
      <View style={styles.contentRow}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? colors.textOnPrimary : colors.textPrimary} size="small" />
        ) : (
          <>
            {renderIcon()}
            <Text
              style={[
                styles.label,
                labelSizeStyles[size],
                variant === 'primary' && styles.labelPrimary,
                variant === 'secondary' && styles.labelSecondary,
                variant === 'ghost' && styles.labelGhost,
                variant === 'danger' && styles.labelDanger,
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </View>
    );
  };

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onPress}
        activeOpacity={0.85}
        disabled={isDisabled}
        style={[isDisabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, sizeStyles[size], styles.primaryGradient]}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.base,
        sizeStyles[size],
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
      disabled={isDisabled}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    base: {
      width: '100%',
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sizeSm: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    sizeMd: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    sizeLg: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
    primaryGradient: {
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 16,
      elevation: 4,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    danger: {
      backgroundColor: colors.errorLight,
      borderWidth: 1,
      borderColor: colors.error,
    },
    disabled: {
      opacity: 0.5,
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    label: {
      fontWeight: '600',
    },
    labelSm: {
      fontSize: 14,
    },
    labelMd: {
      fontSize: 16,
    },
    labelLg: {
      fontSize: 18,
    },
    labelPrimary: {
      color: colors.textOnPrimary,
    },
    labelSecondary: {
      color: colors.textPrimary,
    },
    labelGhost: {
      color: colors.primary,
    },
    labelDanger: {
      color: colors.error,
    },
  });
