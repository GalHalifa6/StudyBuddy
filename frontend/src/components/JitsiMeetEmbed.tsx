import React, { useState, useMemo } from 'react';

interface JitsiMeetEmbedProps {
  roomName: string;
  jwtToken?: string;
  displayName?: string;
  userEmail?: string;
  userId?: number;
  isExpert?: boolean;
  onParticipantLeft?: () => void;
  onParticipantJoined?: () => void;
  config?: {
    startWithAudioMuted?: boolean;
    startWithVideoMuted?: boolean;
    enableWelcomePage?: boolean;
    enableClosePage?: boolean;
  };
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Jitsi Meet Embed Component for Web
 * Uses iframe with URL params for reliable video conferencing
 */
export const JitsiMeetEmbed: React.FC<JitsiMeetEmbedProps> = ({
  roomName,
  jwtToken,
  displayName = 'Participant',
  userEmail,
  style,
  className,
}) => {
  const [isLoading, setIsLoading] = useState(true);

  // Extract the path part used by JaaS (appId/roomName) while keeping slashes
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

  // Build Jitsi URL with all config params
  const jitsiUrl = useMemo(() => {
    const safeRoom = roomPath;

    const toolbarButtons = encodeURIComponent(JSON.stringify([
      'microphone',
      'camera',
      'hangup',
      'fullscreen',
      'tileview',
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
      `config.toolbarButtons=${toolbarButtons}`,
      'interfaceConfig.SHOW_JITSI_WATERMARK=false',
      'interfaceConfig.SHOW_BRAND_WATERMARK=false',
      'interfaceConfig.SHOW_POWERED_BY=false',
      'interfaceConfig.MOBILE_APP_PROMO=false',
      'interfaceConfig.TOOLBAR_ALWAYS_VISIBLE=true',
    ].filter(Boolean).join('&');

    const tokenParam = jwtToken ? `?jwt=${jwtToken}` : '';
    return `https://8x8.vc/${safeRoom}${tokenParam}#${configParams}`;
  }, [roomPath, displayName, userEmail, jwtToken]);

  return (
    <div 
      style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000', ...style }} 
      className={className}
    >
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          zIndex: 10,
        }}>
          <div style={{ color: '#fff', textAlign: 'center' }}>
            <div style={{ marginBottom: '1rem' }}>Loading video call...</div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Connecting to Jitsi Meet</div>
          </div>
        </div>
      )}
      <iframe
        src={jitsiUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
        style={{
          width: '100%',
          height: '100%',
          border: 0,
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
        }}
        title="Jitsi Meet Video Call"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};

