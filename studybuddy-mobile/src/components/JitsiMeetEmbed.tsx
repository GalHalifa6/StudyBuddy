import React, { useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

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
}

/**
 * Jitsi Meet Embed Component for React Native
 * Uses Jitsi External API for better control over authentication
 */
export const JitsiMeetEmbed: React.FC<JitsiMeetEmbedProps> = ({
  roomName,
  jwtToken,
  displayName = 'Participant',
  userEmail,
  style,
}) => {
  // Extract room name from full URL if needed and clean it
  const cleanRoomName = useMemo(() => {
    try {
      const url = new URL(roomName);
      if (url.hostname.includes('8x8.vc') || url.hostname.includes('meet.jit.si')) {
        return url.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
      }
    } catch (e) {
      // ignore
    }

    const name = roomName.includes('8x8.vc/') ? roomName.split('8x8.vc/')[1] : roomName;
    return name.replace(/[^a-zA-Z0-9-_/]/g, '').replace(/^\/+/, '').replace(/\/+$/, '');
  }, [roomName]);

  // Create HTML that uses Jitsi External API with anonymous authentication
  const jitsiHtml = useMemo(() => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #meet { width: 100%; height: 100%; background: #000; }
  </style>
</head>
<body>
  <div id="meet"></div>
  <script src="https://8x8.vc/external_api.js"></script>
  <script>
    const domain = '8x8.vc';
    const options = {
      roomName: '${cleanRoomName}',
      width: '100%',
      height: '100%',
      parentNode: document.querySelector('#meet'),
      userInfo: {
        displayName: '${displayName.replace(/'/g, "\\'")}',
        email: '${userEmail || ''}'
      },
      jwt: '${jwtToken || ''}',
      configOverwrite: {
        prejoinPageEnabled: false,
        prejoinConfig: { enabled: false },
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        enableClosePage: false,
        disableDeepLinking: true,
        enableLobbyChat: false,
        hideLobbyButton: true,
        requireDisplayName: false,
        enableInsecureRoomNameWarning: false,
        disableInviteFunctions: true,
        toolbarButtons: [
          'microphone', 'camera', 'hangup', 'fullscreen', 'tileview'
        ],
        disableThirdPartyRequests: true,
        analytics: { disabled: true },
        p2p: { enabled: true },
        enableNoAudioDetection: false,
        enableNoisyMicDetection: false,
        disableRemoteMute: true,
        remoteVideoMenu: { disableKick: true, disableGrantModerator: true },
        disableModeratorIndicator: true,
        startAudioOnly: false,
        lobby: { autoKnock: true, enableChat: false },
        notifications: [],
        disablePolls: true,
        doNotStoreRoom: true
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        MOBILE_APP_PROMO: false,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        HIDE_INVITE_MORE_HEADER: true,
        DISABLE_FOCUS_INDICATOR: true,
        DISABLE_DOMINANT_SPEAKER_INDICATOR: true,
        TOOLBAR_ALWAYS_VISIBLE: true,
        DEFAULT_BACKGROUND: '#000000',
        DISABLE_VIDEO_BACKGROUND: true,
        GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
        DISPLAY_WELCOME_FOOTER: false,
        DISPLAY_WELCOME_PAGE_ADDITIONAL_CARD: false,
        DISPLAY_WELCOME_PAGE_CONTENT: false,
        DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
        RECENT_LIST_ENABLED: false,
        VIDEO_QUALITY_LABEL_DISABLED: true,
        CONNECTION_INDICATOR_DISABLED: true
      }
    };
    
    try {
      const api = new JitsiMeetExternalAPI(domain, options);
      
      // Auto-join even if in lobby
      api.addEventListener('participantRoleChanged', (event) => {
        if (event.role === 'moderator') {
          api.executeCommand('toggleLobby', false);
        }
      });
      
      // Handle errors
      api.addEventListener('errorOccurred', (error) => {
        console.log('Jitsi error:', error);
      });
      
      // Notify when ready
      api.addEventListener('videoConferenceJoined', () => {
        console.log('Successfully joined conference');
      });
    } catch (e) {
      console.error('Failed to initialize Jitsi:', e);
      document.body.innerHTML = '<div style="color:white;text-align:center;padding:20px;">Failed to load video. Please try again.</div>';
    }
  </script>
</body>
</html>`;
  }, [cleanRoomName, displayName, userEmail]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html: jitsiHtml }}
        style={styles.webview}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        mediaCapturePermissionGrantType="grant"
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
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

