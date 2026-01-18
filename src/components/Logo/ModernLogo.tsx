import React from 'react';

interface ModernLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ModernLogo: React.FC<ModernLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-10',
    md: 'w-12 h-16',
    lg: 'w-20 h-24',
    xl: 'w-32 h-40',
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      <svg viewBox="0 0 100 120" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(210, 58%, 10%)" />
            <stop offset="50%" stopColor="hsl(210, 58%, 14%)" />
            <stop offset="100%" stopColor="hsl(210, 58%, 20%)" />
          </linearGradient>
          <linearGradient id="logoGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(210, 50%, 28%)" />
            <stop offset="50%" stopColor="hsl(210, 45%, 38%)" />
            <stop offset="100%" stopColor="hsl(210, 45%, 48%)" />
          </linearGradient>
        </defs>

        <path d="M10 10 L10 110 L60 60 Z" fill="url(#logoGradient)" className="drop-shadow-lg" />

        <path
          d="M60 60 L60 110 L90 110 L90 10 Z"
          fill="url(#logoGradient2)"
          className="drop-shadow-lg"
        />
      </svg>
    </div>
  );
};
