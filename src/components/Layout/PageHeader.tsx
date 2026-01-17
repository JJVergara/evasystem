import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-8', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground animate-fade-in">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-lg animate-fade-in">{description}</p>
          )}
        </div>
        {children && <div className="animate-fade-in">{children}</div>}
      </div>
    </div>
  );
}
