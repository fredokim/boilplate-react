import { useRealtimeChat } from '../chat/hooks/useRealtimeChat';
import { liveChatRoomId, liveChatTransport } from '../chat/realtime/liveChatRoom';
import type { ChatTransport } from '../chat/realtime/types';
import type { VideoSource } from '../player/model/player';
import { progressiveDemoSource } from '../player/model/liveSources';
import { LiveExperienceView } from '../views/LiveExperienceView';


export type LiveExperienceContainerProps = {
  transport?: ChatTransport;
  roomId?: string;
  source?: VideoSource;
};

export default function LiveExperienceContainer({
  roomId = liveChatRoomId,
  source = progressiveDemoSource,
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
