import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function MetricCard({ title, value, description, icon, trend, className }: MetricCardProps) {
  return (
    <Card className={cn('shadow-card hover:shadow-elegant transition-all duration-300', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <div className="text-primary">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          {value}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && (
          <div
            className={cn(
              'text-xs mt-2 flex items-center',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}
          >
            <span className={cn('mr-1', trend.isPositive ? 'text-success' : 'text-destructive')}>
              {trend.isPositive ? '↗' : '↘'}
            </span>
            {trend.value}% vs mes anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
}
