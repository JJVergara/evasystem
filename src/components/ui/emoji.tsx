import {
  EMOJIS,
  type StatusEmoji,
  type NavigationEmoji,
  type ActionEmoji,
  type EntityEmoji,
  type FeedbackEmoji,
  type UIEmoji,
  type PriorityEmoji,
} from '@/constants';
import { cn } from '@/lib/utils';

type EmojiName =
  | `status.${StatusEmoji}`
  | `navigation.${NavigationEmoji}`
  | `actions.${ActionEmoji}`
  | `entities.${EntityEmoji}`
  | `feedback.${FeedbackEmoji}`
  | `ui.${UIEmoji}`
  | `priority.${PriorityEmoji}`
  | `social.${'instagram' | 'followers' | 'likes' | 'comments' | 'shares' | 'reach' | 'impressions'}`;

interface EmojiProps {
  name: EmojiName;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

const imageSizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-10 h-10',
};

export function Emoji({ name, size = 'md', className }: EmojiProps) {
  const [category, key] = name.split('.') as [keyof typeof EMOJIS, string];
  const emoji = (EMOJIS[category] as Record<string, string>)[key];

  if (name === 'social.instagram' || emoji === 'instagram-image') {
    return (
      <img
        src="/instagram-icon.webp"
        alt="Instagram"
        className={cn(imageSizeClasses[size], className)}
      />
    );
  }

  return (
    <span className={cn(sizeClasses[size], className)} role="img" aria-label={key}>
      {emoji}
    </span>
  );
}

interface StatusEmojiProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending' | 'inProgress';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export function StatusEmoji({ status, size = 'md', className }: StatusEmojiProps) {
  return <Emoji name={`status.${status}`} size={size} className={className} />;
}

interface InstagramIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export function InstagramIcon({ size = 'md', className }: InstagramIconProps) {
  return (
    <img
      src="/instagram-icon.webp"
      alt="Instagram"
      className={cn(imageSizeClasses[size], className)}
    />
  );
}
