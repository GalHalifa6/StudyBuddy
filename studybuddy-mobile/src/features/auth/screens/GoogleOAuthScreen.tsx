import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { AuthStackParamList } from '../../../navigation/AuthStack';
import { useAuth } from '../../../auth/AuthContext';
import { useToast } from '../../../components/ui/ToastProvider';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { API_BASE_URL } from '../../../api/env';

// This must be called at module level for web browser auth to work properly
WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<AuthStackParamList, 'GoogleOAuth'>;

/**
 * Google OAuth login screen using expo-auth-session.
 * Opens the system browser for Google authentication (not a WebView).
 * This complies with Google's OAuth 2.0 security requirements.
 */
const GoogleOAuthScreen: React.FC<Props> = ({ navigation }) => {
  const { loginWithToken } = useAuth();
  const { showToast } = useToast();
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get backend URL (remove /api suffix)
  const backendUrl = API_BASE_URL.replace(/\/api$/, '');
  
  // Create redirect URI for Expo
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'studybuddy',
    path: 'auth/callback',
  });

  // Log the redirect URI for debugging
  useEffect(() => {
    console.log('[GoogleOAuth] Redirect URI:', redirectUri);
    console.log('[GoogleOAuth] Backend URL:', backendUrl);
  }, [redirectUri, backendUrl]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build the OAuth URL - we'll use our backend's OAuth endpoint
      // The backend will handle the Google OAuth flow and redirect back with a token
      const authUrl = `${backendUrl}/oauth2/authorization/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
      
      console.log('[GoogleOAuth] Opening auth URL:', authUrl);

      // Open system browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri,
        {
          showInRecents: true,
          preferEphemeralSession: false,
        }
      );

      console.log('[GoogleOAuth] Auth result:', result);

      if (result.type === 'success' && result.url) {
        // Parse the callback URL to extract the token
        const url = new URL(result.url);
        const token = url.searchParams.get('token');
        const errorParam = url.searchParams.get('error');

        if (errorParam) {
          console.error('[GoogleOAuth] Error from callback:', errorParam);
          setError(`Google login failed: ${errorParam}`);
          showToast('Google login failed', 'error');
          return;
        }

        if (token) {
          console.log('[GoogleOAuth] Token received, logging in...');
          await loginWithToken(token);
          showToast('Welcome! You\'re now signed in with Google.', 'success');
          // Navigation will be handled by auth context
        } else {
          console.error('[GoogleOAuth] No token in callback URL');
          setError('No authentication token received. Please try again.');
        }
      } else if (result.type === 'cancel') {
        console.log('[GoogleOAuth] User cancelled');
        // User cancelled - just go back
        navigation.goBack();
      } else if (result.type === 'dismiss') {
        console.log('[GoogleOAuth] Auth dismissed');
        // Dismissed - check if we should go back or show error
      }
    } catch (err) {
      console.error('[GoogleOAuth] Error during authentication:', err);
      setError('Failed to complete authentication. Please try again.');
      showToast('Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Start auth flow automatically when screen mounts
  useEffect(() => {
    handleGoogleLogin();
  }, []);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleRetry = () => {
    setError(null);
    handleGoogleLogin();
  };

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Sign in with Google</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleGoBack}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Sign in with Google</Text>
        <View style={styles.backButton} />
      </View>
      
      <View style={styles.loadingContainer}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Opening Google Sign-In...
            </Text>
            <Text style={[styles.hintText, { color: colors.textTertiary }]}>
              Please complete sign-in in your browser
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="logo-google" size={64} color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
              Google Sign-In
            </Text>
            <TouchableOpacity 
              style={[styles.signInButton, { backgroundColor: colors.primary }]}
              onPress={handleGoogleLogin}
            >
              <Ionicons name="logo-google" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.signInButtonText}>Sign in with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleGoBack}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  hintText: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  signInButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelText: {
    fontSize: 15,
    marginTop: 16,
  },
});

export default GoogleOAuthScreen;
