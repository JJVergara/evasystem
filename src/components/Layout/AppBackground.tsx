import type { ReactNode } from 'react';

interface AppBackgroundProps {
  children: ReactNode;
  variant?: 'default' | 'subtle';
}

export function AppBackground({ children, variant = 'default' }: AppBackgroundProps) {
  const backgroundClass =
    variant === 'subtle' ? 'min-h-screen bg-background' : 'min-h-screen bg-background';

  return <div className={backgroundClass}>{children}</div>;
}
