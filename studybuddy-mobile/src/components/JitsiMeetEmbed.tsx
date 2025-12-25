import React, { useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

interface JitsiMeetEmbedProps {
  roomName: string;
  displayName?: string;
  userEmail?: string;
  userId?: number;
  isExpert?: boolean; // If true, this user is the expert/host
  config?: {
    startWithAudioMuted?: boolean;
    startWithVideoMuted?: boolean;
    enableWelcomePage?: boolean;
    enableClosePage?: boolean;
  };
  style?: any;
}

/**
 * Jitsi Meet Embed Component for React Native
 * Embeds a Jitsi Meet video conference in a WebView
 */
export const JitsiMeetEmbed: React.FC<JitsiMeetEmbedProps> = ({
  roomName,
  displayName,
  userEmail,
  userId,
  isExpert = false,
  config = {},
  style,
}) => {
  // Extract room name from full URL if needed
  const cleanRoomName = useMemo(() => {
    return roomName.includes('meet.jit.si/') 
      ? roomName.split('meet.jit.si/')[1] 
      : roomName;
  }, [roomName]);

  // Build Jitsi Meet URL with configuration options
  const jitsiUrl = useMemo(() => {
    let url = `https://meet.jit.si/${cleanRoomName}`;
    const params = new URLSearchParams();
    
    // Pass user info to skip login prompt - this uses the app's authentication
    if (displayName) {
      params.append('userInfo.displayName', displayName);
    }
    if (userEmail) {
      params.append('userInfo.email', userEmail);
    }
    if (userId) {
      // Use userId as a unique identifier
      params.append('userInfo.id', String(userId));
    }
    
    // Disable welcome/prejoin page - users are already authenticated in the app
    params.append('config.prejoinPageEnabled', 'false');
    params.append('config.enableWelcomePage', 'false');
    
    // Expert (host) configuration - expert gets moderator privileges
    if (isExpert) {
      // Expert joins with audio/video enabled and becomes moderator
      params.append('config.startWithAudioMuted', 'false');
      params.append('config.startWithVideoMuted', 'false');
      // Expert is automatically moderator (first to join or can be set)
      params.append('config.startAudioOnly', 'false');
    } else {
      // Students join with audio/video based on config or defaults
      if (config.startWithAudioMuted !== undefined) {
        params.append('config.startWithAudioMuted', String(config.startWithAudioMuted));
      } else {
        params.append('config.startWithAudioMuted', 'false');
      }
      if (config.startWithVideoMuted !== undefined) {
        params.append('config.startWithVideoMuted', String(config.startWithVideoMuted));
      } else {
        params.append('config.startWithVideoMuted', 'false');
      }
    }
    
    if (config.enableClosePage === false) {
      params.append('config.enableClosePage', 'false');
    }

    // Add interface configuration for better mobile UX
    params.append('config.hideDisplayName', 'false');
    params.append('config.hideEmailInSettings', 'true');
    params.append('interfaceConfig.SHOW_JITSI_WATERMARK', 'false');
    params.append('interfaceConfig.SHOW_BRAND_WATERMARK', 'false');
    params.append('interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS', 'false');
    params.append('config.p2p.enabled', 'true'); // Enable peer-to-peer for better mobile performance
    
    // Disable login requirement - we're using app authentication
    params.append('config.requireDisplayName', 'false');
    params.append('config.enableUserRolesBasedOnToken', 'false');

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return url;
  }, [cleanRoomName, displayName, userEmail, userId, isExpert, config]);

  // Handle navigation requests to keep everything in WebView
  const handleShouldStartLoadWithRequest = (request: any) => {
    // Only allow Jitsi domains and block redirects to external apps
    const url = request.url || '';
    if (url.includes('meet.jit.si') || url.includes('jitsi') || url.startsWith('https://')) {
      return true; // Allow loading
    }
    return false; // Block external redirects
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ uri: jitsiUrl }}
        style={styles.webview}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        // @ts-ignore - iOS specific prop
        allowsProtectedMedia={true}
        // Prevent opening links in external browser/app
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        // Custom user agent to help with mobile compatibility
        userAgent={Platform.OS === 'ios' 
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
          : 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
        }
        // Handle errors gracefully
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
        // Handle HTTP errors
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView HTTP error: ', nativeEvent);
        }}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5e72e4" />
          </View>
        )}
      />
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
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});

