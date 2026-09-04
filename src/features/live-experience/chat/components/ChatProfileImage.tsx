type ChatProfileImageProps = {
  displayName: string;
  src: string;
};

export function ChatProfileImage({ displayName, src }: ChatProfileImageProps) {
  return <img alt={`${displayName}'s profile`} className="live-chat__profile" height="36" src={src} width="36" />;
}

