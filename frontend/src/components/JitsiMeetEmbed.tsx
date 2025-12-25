import React, { useMemo, useState, useEffect } from 'react';

interface JitsiMeetEmbedProps {
  roomName: string;
  displayName?: string;
  userEmail?: string;
  userId?: number;
  isExpert?: boolean; // If true, this user is the expert/host
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
 * Embeds a Jitsi Meet video conference in an iframe
 */
export const JitsiMeetEmbed: React.FC<JitsiMeetEmbedProps> = ({
  roomName,
  displayName,
  userEmail,
  userId,
  isExpert = false,
  config = {},
  style,
  className,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Memoize the URL to prevent unnecessary re-renders
  const jitsiUrl = useMemo(() => {
    // Extract room name from full URL if needed
    const cleanRoomName = roomName.includes('meet.jit.si/') 
      ? roomName.split('meet.jit.si/')[1] 
      : roomName;

    // Build Jitsi Meet URL with configuration options
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

    // Add interface configuration for better UX
    params.append('config.hideDisplayName', 'false');
    params.append('config.hideEmailInSettings', 'true');
    params.append('interfaceConfig.SHOW_JITSI_WATERMARK', 'false');
    params.append('interfaceConfig.SHOW_BRAND_WATERMARK', 'false');
    params.append('interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS', 'false');
    
    // Disable login requirement - we're using app authentication
    params.append('config.requireDisplayName', 'false');
    params.append('config.enableUserRolesBasedOnToken', 'false');

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return url;
  }, [roomName, displayName, userEmail, userId, isExpert, config]);

  // Handle iframe load
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [jitsiUrl]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...style }} className={className}>
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
      {hasError && (
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
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ color: '#ef4444', textAlign: 'center' }}>
            <div style={{ marginBottom: '0.5rem', fontSize: '1.125rem', fontWeight: 'bold' }}>Failed to load video call</div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Please check your internet connection and try again</div>
          </div>
          <button
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
              window.location.reload();
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#5e72e4',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}
      <iframe
        src={jitsiUrl}
        allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
        style={{
          width: '100%',
          height: '100%',
          border: 0,
          flexShrink: 0,
          flexGrow: 0,
          minHeight: 0,
          maxHeight: '100%',
          display: 'block',
          opacity: isLoading || hasError ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
        }}
        title="Jitsi Meet Video Call"
        allowFullScreen
        scrolling="no"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};

