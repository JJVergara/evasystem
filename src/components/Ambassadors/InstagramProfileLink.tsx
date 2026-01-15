import { Instagram, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface InstagramProfileLinkProps {
  username: string;
  followerCount?: number;
  className?: string;
}

export function InstagramProfileLink({
  username,
  followerCount,
  className,
}: InstagramProfileLinkProps) {
  const instagramUrl = `https://instagram.com/${username.replace('@', '')}`;

  const handleClick = () => {
    window.open(instagramUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={className}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="flex items-center gap-2 h-auto p-2"
      >
        <Instagram className="h-4 w-4 text-pink-600" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">@{username.replace('@', '')}</span>
          {followerCount && (
            <Badge variant="secondary" className="text-xs h-auto py-0 px-1">
              {followerCount.toLocaleString()} seguidores
            </Badge>
          )}
        </div>
        <ExternalLink className="h-3 w-3 text-muted-foreground" />
      </Button>
    </div>
  );
}
