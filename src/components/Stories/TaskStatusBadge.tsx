import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, AlertTriangle, RotateCcw } from 'lucide-react';

interface TaskStatusBadgeProps {
  status: 'pending' | 'uploaded' | 'in_progress' | 'completed' | 'invalid' | 'expired';
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const statusConfig = {
    pending: {
      variant: 'outline' as const,
      icon: Clock,
      label: 'Pendiente',
      className: 'text-muted-foreground border-border',
    },
    uploaded: {
      variant: 'secondary' as const,
      icon: Clock,
      label: 'Subida',
      className: 'text-info bg-info/10 border-info/30',
    },
    in_progress: {
      variant: 'default' as const,
      icon: RotateCcw,
      label: 'En Progreso',
      className: 'text-warning bg-warning/10 border-warning/30',
    },
    completed: {
      variant: 'default' as const,
      icon: CheckCircle,
      label: 'Completada',
      className: 'text-success bg-success/10 border-success/30',
    },
    invalid: {
      variant: 'destructive' as const,
      icon: XCircle,
      label: 'Inválida',
      className: 'text-destructive bg-destructive/10 border-destructive/30',
    },
    expired: {
      variant: 'destructive' as const,
      icon: AlertTriangle,
      label: 'Expirada',
      className: 'text-destructive bg-destructive/10 border-destructive/30',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
