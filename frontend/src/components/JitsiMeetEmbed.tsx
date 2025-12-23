import React, { useMemo } from 'react';

interface JitsiMeetEmbedProps {
  roomName: string;
  displayName?: string;
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
  config = {},
  style,
  className,
}) => {
  // Memoize the URL to prevent unnecessary re-renders
  const jitsiUrl = useMemo(() => {
    // Extract room name from full URL if needed
    const cleanRoomName = roomName.includes('meet.jit.si/') 
      ? roomName.split('meet.jit.si/')[1] 
      : roomName;

    // Build Jitsi Meet URL - simple approach that works reliably
    // Use the room name directly in the URL path (standard Jitsi format)
    // Add display name as URL parameter if provided
    let url = `https://meet.jit.si/${cleanRoomName}`;
    
    if (displayName) {
      const params = new URLSearchParams();
      params.append('userInfo.displayName', displayName);
      url += `?${params.toString()}`;
    }

    return url;
  }, [roomName, displayName]);

  return (
    <iframe
      src={jitsiUrl}
      allow="camera; microphone; fullscreen; speaker; display-capture"
      style={{
        width: '100%',
        height: '100%',
        border: 0,
        flexShrink: 0,
        flexGrow: 0,
        minHeight: 0,
        maxHeight: '100%',
        display: 'block',
        ...style,
      }}
      className={className}
      title="Jitsi Meet"
      allowFullScreen
      scrolling="no"
    />
  );
};

