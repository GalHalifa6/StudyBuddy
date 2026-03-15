import React, { useMemo } from 'react';
import { Controller, Control } from 'react-hook-form';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View } from 'react-native';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

interface TextFieldProps extends TextInputProps {
  label: string;
  name: string;
  control: Control<any>;
  secure?: boolean;
  error?: string;
}

export const TextField: React.FC<TextFieldProps> = ({ label, name, control, secure = false, error, ...rest }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { style: inputStyle, ...inputProps } = rest as TextInputProps & { style?: StyleProp<TextStyle> };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, error ? styles.inputError : undefined, inputStyle]}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={secure}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value != null ? String(value) : ''}
            {...inputProps}
          />
        )}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      width: '100%',
      marginBottom: spacing.lg,
    },
    label: {
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      fontSize: 14,
      fontWeight: '600',
    },
    input: {
      width: '100%',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 16,
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      color: colors.error,
      marginTop: spacing.xs,
      fontSize: 12,
    },
  });

