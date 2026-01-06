import React, { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../../components/ui/Screen';
import { TextField } from '../../../components/ui/TextField';
import { Button } from '../../../components/ui/Button';
import { typography } from '../../../theme/typography';
import { spacing, borderRadius } from '../../../theme/spacing';
import { useAuth } from '../../../auth/AuthContext';
import { useToast } from '../../../components/ui/ToastProvider';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/AuthStack';
import { useAppTheme, Palette } from '../../../theme/ThemeProvider';
import { Logo } from '../../../components/Logo';
import { API_BASE_URL } from '../../../api/env';

const schema = z.object({
  username: z.string().min(3, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

// Get OAuth URL (matches web frontend)
const getOAuthAuthUrl = (provider: string = 'google'): string => {
  // Remove /api suffix for OAuth endpoint
  const baseUrl = API_BASE_URL.replace(/\/api$/, '');
  return `${baseUrl}/oauth2/authorization/${provider}`;
};

const LoginScreen: React.FC<NativeStackScreenProps<AuthStackParamList, 'Login'>> = ({ navigation }) => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { username: '', password: '' } });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await login({ username: values.username, password: values.password });
      showToast('Welcome back!', 'success');
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Login failed. Please try again.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const oauthUrl = getOAuthAuthUrl('google');
      const supported = await Linking.canOpenURL(oauthUrl);
      if (supported) {
        await Linking.openURL(oauthUrl);
      } else {
        showToast('Unable to open Google login', 'error');
      }
    } catch (error) {
      showToast('Google login failed', 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Logo size="xl" showText dark={isDark} />
        </View>

        {/* Welcome Text */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.subtitle}>Sign in to continue your learning journey.</Text>
        </View>

        {/* Google OAuth Button */}
        <Pressable
          style={({ pressed }) => [styles.googleButton, pressed && styles.googleButtonPressed]}
          onPress={handleGoogleLogin}
          disabled={googleLoading}
        >
          <View style={styles.googleIconContainer}>
            {/* Google Icon SVG as View */}
            <View style={styles.googleIcon}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
          </View>
          <Text style={styles.googleButtonText}>
            {googleLoading ? 'Opening...' : 'Continue with Google'}
          </Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with email</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextField
            label="Username"
            name="username"
            control={control}
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.username?.message}
            returnKeyType="next"
          />
          <TextField
            label="Password"
            name="password"
            control={control}
            secure
            error={errors.password?.message}
            returnKeyType="done"
          />
          <Button 
            label="Sign In" 
            onPress={handleSubmit(onSubmit)} 
            loading={loading} 
            disabled={loading}
            icon="log-in-outline"
          />
        </View>

        {/* Footer Links */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} accessibilityRole="button">
            <Text style={styles.link}>
              Need an account? <Text style={styles.linkAccent}>Create one</Text>
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
      paddingVertical: spacing.xl,
    },
    logoSection: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    header: {
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.lg,
    },
    welcomeText: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    googleButtonPressed: {
      backgroundColor: colors.surfaceHover,
      transform: [{ scale: 0.98 }],
    },
    googleIconContainer: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    googleIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#ddd',
    },
    googleIconText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#4285F4',
    },
    googleButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.md,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      paddingHorizontal: spacing.md,
      fontSize: 13,
      color: colors.textMuted,
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

export default LoginScreen;
