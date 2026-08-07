import { useMemo } from 'react';
import { useRealtimeChat } from '../chat/hooks/useRealtimeChat';
import { createMockRealtimeChatAdapter } from '../chat/realtime/mockRealtimeChatAdapter';
import type { VideoSource } from '../player/model/player';
import { LiveExperienceView } from '../views/LiveExperienceView';

const videoSource: VideoSource = {
  kind: 'progressive',
  src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  mimeType: 'video/mp4',
};

export default function LiveExperienceContainer() {
  const chatAdapter = useMemo(() => createMockRealtimeChatAdapter(), []);
  const { connectionState, messages } = useRealtimeChat(chatAdapter);

  return <LiveExperienceView chatMessages={messages} connectionState={connectionState} videoSource={videoSource} />;
}

