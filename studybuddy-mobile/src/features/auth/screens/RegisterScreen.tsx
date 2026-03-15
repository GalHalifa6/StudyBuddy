import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '../../../components/ui/Screen';
import { TextField } from '../../../components/ui/TextField';
import { Button } from '../../../components/ui/Button';
import { typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import { useAuth } from '../../../auth/AuthContext';
import { useToast } from '../../../components/ui/ToastProvider';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/AuthStack';
import { useAppTheme, Palette } from '../../../theme/ThemeProvider';
import { Logo } from '../../../components/Logo';

const schema = z
  .object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine(values => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { register } = useAuth();
  const { showToast } = useToast();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async ({ confirmPassword, username, email, password }: FormValues) => {
    setLoading(true);
    try {
      const response = await register({ username, email, password });
      showToast(response.message ?? 'Account created! Please log in.', response.success ? 'success' : 'info');
      if (response.success) {
        navigation.navigate('Login');
      }
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Registration failed. Please try again.';
      Alert.alert(
        'Registration Failed',
        message.includes('exists') || message.includes('taken')
          ? 'This username or email is already registered. Please try a different one or log in.'
          : message,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Logo size="lg" showText={false} dark={isDark} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join the StudyBuddy community and find your learning crew.</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Username"
            name="username"
            control={control}
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.username?.message}
          />
          <TextField
            label="Email"
            name="email"
            control={control}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email?.message}
          />
          <TextField
            label="Password"
            name="password"
            control={control}
            secure
            error={errors.password?.message}
          />
          <TextField
            label="Confirm Password"
            name="confirmPassword"
            control={control}
            secure
            error={errors.confirmPassword?.message}
          />
          <Button 
            label="Create Account" 
            onPress={handleSubmit(onSubmit)} 
            loading={loading} 
            disabled={loading}
            icon="person-add-outline"
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} accessibilityRole="button">
            <Text style={styles.link}>
              Already have an account? <Text style={styles.linkAccent}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingVertical: spacing.lg,
    },
    logoSection: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    header: {
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    form: {
      gap: spacing.md,
      paddingTop: spacing.sm,
    },
    footer: {
      marginTop: spacing.xl,
      alignItems: 'center',
    },
    link: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 15,
    },
    linkAccent: {
      color: colors.primary,
      fontWeight: '600',
    },
  });

export default RegisterScreen;
