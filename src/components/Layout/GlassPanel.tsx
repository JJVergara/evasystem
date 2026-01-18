import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'glass' | 'solid';
}

export function GlassPanel({
  children,
  className,
  size = 'md',
  variant = 'solid',
}: GlassPanelProps) {
  const sizeClasses = {
    sm: 'p-4 rounded-xl',
    md: 'p-6 rounded-2xl',
    lg: 'p-8 rounded-3xl',
    xl: 'p-10 rounded-3xl',
  };

  const variantClasses = {
    glass: 'backdrop-blur-md bg-card/80 border-border/50',
    solid: 'bg-background border-border',
  };

  return (
    <div
      className={cn(
        'shadow-elegant border animate-fade-in',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
