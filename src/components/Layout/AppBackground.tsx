import type { ReactNode } from 'react';

interface AppBackgroundProps {
  children: ReactNode;
  variant?: 'default' | 'subtle';
}

export function AppBackground({ children, variant = 'default' }: AppBackgroundProps) {
  const backgroundClass =
    variant === 'subtle'
      ? 'min-h-screen bg-gradient-to-br from-gray-50/50 via-gray-100/30 to-gray-200/50'
      : 'min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200';

  return <div className={backgroundClass}>{children}</div>;
}
