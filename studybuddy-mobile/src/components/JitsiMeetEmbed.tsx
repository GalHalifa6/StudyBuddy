import React, { useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

interface JitsiMeetEmbedProps {
  roomName: string;
  displayName?: string;
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
  config = {},
  style,
}) => {
  // Extract room name from full URL if needed
  const cleanRoomName = useMemo(() => {
    return roomName.includes('meet.jit.si/') 
      ? roomName.split('meet.jit.si/')[1] 
      : roomName;
  }, [roomName]);

  // Build Jitsi Meet URL - simple approach that works reliably
  // Use the room name directly in the URL path (standard Jitsi format)
  // Add display name as URL parameter if provided
  const jitsiUrl = useMemo(() => {
    let url = `https://meet.jit.si/${cleanRoomName}`;
    
    if (displayName) {
      const params = new URLSearchParams();
      params.append('userInfo.displayName', displayName);
      url += `?${params.toString()}`;
    }

    return url;
  }, [cleanRoomName, displayName]);

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

