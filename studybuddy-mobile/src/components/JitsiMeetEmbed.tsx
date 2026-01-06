import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, Platform, Linking, Alert } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface JitsiMeetEmbedProps {
  roomName: string;
  jwtToken?: string;
  displayName?: string;
  userEmail?: string;
  userId?: number;
  isExpert?: boolean;
  config?: {
    startWithAudioMuted?: boolean;
    startWithVideoMuted?: boolean;
    enableWelcomePage?: boolean;
    enableClosePage?: boolean;
  };
  style?: any;
  onHangup?: () => void;
}

/**
 * Jitsi Meet Embed Component for React Native
 * Provides both in-app WebView (when possible) and external browser fallback
 */
export const JitsiMeetEmbed: React.FC<JitsiMeetEmbedProps> = ({
  roomName,
  jwtToken,
  displayName = 'Participant',
  userEmail,
  style,
  onHangup,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const webViewRef = useRef<WebView>(null);

  // Extract room path from URL (like web version)
  const roomPath = useMemo(() => {
    try {
      const url = new URL(roomName);
      if (url.hostname.includes('8x8.vc') || url.hostname.includes('meet.jit.si')) {
        return url.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
      }
    } catch (e) {
      // Not a full URL; continue to sanitize
    }

    const fromEightByEight = roomName.includes('8x8.vc/') ? roomName.split('8x8.vc/')[1] : roomName;
    return fromEightByEight.replace(/[^a-zA-Z0-9-_/]/g, '').replace(/^\/+/, '').replace(/\/+$/, '');
  }, [roomName]);

  // Build Jitsi URL with config params (same as web version)
  const jitsiUrl = useMemo(() => {
    const safeRoom = roomPath;

    const toolbarButtons = encodeURIComponent(JSON.stringify([
      'microphone',
      'camera',
      'hangup',
      'fullscreen',
      'tileview',
      'chat',
    ]));

    const configParams = [
      displayName ? `userInfo.displayName="${encodeURIComponent(displayName)}"` : '',
      userEmail ? `userInfo.email="${encodeURIComponent(userEmail)}"` : '',
      'config.prejoinPageEnabled=false',
      'config.prejoinConfig.enabled=false',
      'config.enableWelcomePage=false',
      'config.enableClosePage=false',
      'config.requireDisplayName=false',
      'config.enableLobbyChat=false',
      'config.hideLobbyButton=true',
      'config.disableDeepLinking=true',
      'config.enableInsecureRoomNameWarning=false',
      'config.startWithAudioMuted=false',
      'config.startWithVideoMuted=false',
      'config.startAudioOnly=false',
      'config.disableThirdPartyRequests=true',
      'config.analytics.disabled=true',
      'config.doNotStoreRoom=true',
      'config.disableInviteFunctions=true',
      'config.p2p.enabled=true',
      'config.resolution=720',
      `config.toolbarButtons=${toolbarButtons}`,
      'interfaceConfig.SHOW_JITSI_WATERMARK=false',
      'interfaceConfig.SHOW_BRAND_WATERMARK=false',
      'interfaceConfig.SHOW_POWERED_BY=false',
      'interfaceConfig.MOBILE_APP_PROMO=false',
      'interfaceConfig.TOOLBAR_ALWAYS_VISIBLE=true',
      'interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS=true',
      'interfaceConfig.HIDE_INVITE_MORE_HEADER=true',
    ].filter(Boolean).join('&');

    const tokenParam = jwtToken ? `?jwt=${jwtToken}` : '';
    return `https://8x8.vc/${safeRoom}${tokenParam}#${configParams}`;
  }, [roomPath, displayName, userEmail, jwtToken]);

  // Open in external browser
  const openInBrowser = useCallback(async () => {
    try {
      const canOpen = await Linking.canOpenURL(jitsiUrl);
      if (canOpen) {
        await Linking.openURL(jitsiUrl);
      } else {
        Alert.alert('Error', 'Cannot open browser');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open video call');
    }
  }, [jitsiUrl]);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setLoadAttempts(prev => prev + 1);
    if (loadAttempts >= 1) {
      // After 2 failed attempts, show fallback option
      setShowFallback(true);
    } else {
      setHasError(true);
    }
  }, [loadAttempts]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  // Auto-show fallback after timeout if video doesn't load
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setShowFallback(true);
      }
    }, 15000); // 15 second timeout
    
    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Inject script to handle hangup detection
  const injectedJS = `
    (function() {
      // Listen for page navigation that might indicate hangup
      window.addEventListener('beforeunload', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'hangup' }));
      });
      
      // Notify when video loaded
      window.addEventListener('load', function() {
        setTimeout(function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'loaded' }));
        }, 2000);
      });
      
      // Try to detect when the meeting ends
      const observer = new MutationObserver(function(mutations) {
        const hangupScreen = document.querySelector('[data-testid="hangup-screen"]') || 
                            document.querySelector('.meeting-ended') ||
                            document.body.textContent.includes('The meeting has been ended');
        if (hangupScreen) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'meeting-ended' }));
        }
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
      true;
    })();
  `;

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'hangup' || data.type === 'meeting-ended') {
        onHangup?.();
      } else if (data.type === 'loaded') {
        setIsLoading(false);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [onHangup]);

  // Show fallback UI with option to open in browser
  if (showFallback || hasError) {
    return (
      <View style={[styles.container, styles.fallbackContainer, style]}>
        <View style={styles.fallbackContent}>
          <View style={styles.fallbackIconContainer}>
            <Ionicons name="videocam" size={32} color="#8B5CF6" />
          </View>
          <Text style={styles.fallbackTitle}>Video Session Active</Text>
          <Text style={styles.fallbackText}>
            {hasError 
              ? 'Video failed to load in-app. For the best experience, open the video call in your browser.'
              : 'For better camera & microphone access, we recommend joining via your browser.'}
          </Text>
          
          <TouchableOpacity style={styles.browserButton} onPress={openInBrowser}>
            <Ionicons name="open-outline" size={20} color="#fff" />
            <Text style={styles.browserButtonText}>Open in Browser</Text>
          </TouchableOpacity>
          
          {!hasError && (
            <TouchableOpacity 
              style={styles.continueButton} 
              onPress={() => setShowFallback(false)}
            >
              <Text style={styles.continueButtonText}>Continue in App</Text>
            </TouchableOpacity>
          )}
          
          {hasError && (
            <TouchableOpacity style={styles.retryLink} onPress={handleRetry}>
              <Text style={styles.retryLinkText}>Try loading in app again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Connecting to video...</Text>
          <Text style={styles.loadingSubtext}>Please allow camera & mic when prompted</Text>
          
          {/* Show option to open in browser while loading */}
          <TouchableOpacity 
            style={styles.loadingBrowserButton} 
            onPress={openInBrowser}
          >
            <Ionicons name="open-outline" size={16} color="#8B5CF6" />
            <Text style={styles.loadingBrowserText}>Open in Browser instead</Text>
          </TouchableOpacity>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: jitsiUrl }}
        style={[styles.webview, { opacity: isLoading ? 0.3 : 1 }]}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onHttpError={handleError}
        onMessage={handleMessage}
        injectedJavaScript={injectedJS}
        // Essential WebView settings
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // Media permissions
        mediaCapturePermissionGrantType="grant"
        allowsProtectedMedia={true}
        // File and URL access
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        // iOS specific
        allowsAirPlayForMediaPlayback={true}
        // Android specific
        geolocationEnabled={false}
        setSupportMultipleWindows={false}
        // Don't cache to avoid stale meetings
        cacheEnabled={false}
        // User agent to appear as mobile browser for Jitsi mobile UI
        userAgent={Platform.select({
          ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
          android: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          default: undefined,
        })}
        // Handle permission requests (Android)
        onPermissionRequest={(event) => {
          event.nativeEvent?.grant?.();
        }}
      />
      
      {/* Floating browser button */}
      {!isLoading && (
        <TouchableOpacity style={styles.floatingButton} onPress={openInBrowser}>
          <Ionicons name="open-outline" size={18} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 10,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  loadingSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
  },
  loadingBrowserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 8,
    gap: 8,
  },
  loadingBrowserText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  fallbackIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fallbackTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  fallbackText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  browserButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  continueButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
  },
  retryLink: {
    marginTop: 16,
    paddingVertical: 8,
  },
  retryLinkText: {
    color: '#6b7280',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

