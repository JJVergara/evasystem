import { Badge } from '@/components/ui/badge';

interface TaskStatusBadgeProps {
  status: 'pending' | 'uploaded' | 'in_progress' | 'completed' | 'invalid' | 'expired';
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const statusConfig = {
    pending: {
      variant: 'outline' as const,
      emoji: '🕐',
      label: 'Pendiente',
      className: 'text-muted-foreground border-border',
    },
    uploaded: {
      variant: 'secondary' as const,
      emoji: '🕐',
      label: 'Subida',
      className: 'text-info bg-info/10 border-info/30',
    },
    in_progress: {
      variant: 'default' as const,
      emoji: '🔄',
      label: 'En Progreso',
      className: 'text-warning bg-warning/10 border-warning/30',
    },
    completed: {
      variant: 'default' as const,
      emoji: '✅',
      label: 'Completada',
      className: 'text-success bg-success/10 border-success/30',
    },
    invalid: {
      variant: 'destructive' as const,
      emoji: '❌',
      label: 'Inválida',
      className: 'text-destructive bg-destructive/10 border-destructive/30',
    },
    expired: {
      variant: 'destructive' as const,
      emoji: '⚠️',
      label: 'Expirada',
      className: 'text-destructive bg-destructive/10 border-destructive/30',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
      <span>{config.emoji}</span>
      {config.label}
    </Badge>
  );
}
