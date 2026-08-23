import { useRealtimeChat } from '../chat/hooks/useRealtimeChat';
import { liveChatRoomId, liveChatTransport } from '../chat/realtime/liveChatRoom';
import type { ChatTransport } from '../chat/realtime/types';
import type { VideoSource } from '../player/model/player';
import { LiveExperienceView } from '../views/LiveExperienceView';

const videoSource: VideoSource = {
  kind: 'progressive',
  src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  mimeType: 'video/mp4',
};

export type LiveExperienceContainerProps = {
  transport?: ChatTransport;
  roomId?: string;
  source?: VideoSource;
};

export default function LiveExperienceContainer({
  roomId = liveChatRoomId,
  source = videoSource,
  transport = liveChatTransport,
}: LiveExperienceContainerProps) {
  const { connectionState, diagnostics, messages } = useRealtimeChat({ roomId, transport });

  return (
    <LiveExperienceView
      chatDiagnostics={diagnostics}
      chatMessages={messages}
      connectionState={connectionState}
      videoSource={source}
    />
  );
}
