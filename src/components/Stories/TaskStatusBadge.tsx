
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, AlertTriangle, RotateCcw } from "lucide-react";

interface TaskStatusBadgeProps {
  status: 'pending' | 'uploaded' | 'in_progress' | 'completed' | 'invalid' | 'expired';
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const statusConfig = {
    pending: { 
      variant: "outline" as const, 
      icon: Clock, 
      label: "Pendiente",
      className: "text-gray-600 border-gray-300"
    },
    uploaded: { 
      variant: "secondary" as const, 
      icon: Clock, 
      label: "Subida",
      className: "text-blue-600 bg-blue-50 border-blue-200"
    },
    in_progress: { 
      variant: "default" as const, 
      icon: RotateCcw, 
      label: "En Progreso",
      className: "text-orange-600 bg-orange-50 border-orange-200"
    },
    completed: { 
      variant: "default" as const, 
      icon: CheckCircle, 
      label: "Completada",
      className: "text-green-600 bg-green-50 border-green-200"
    },
    invalid: { 
      variant: "destructive" as const, 
      icon: XCircle, 
      label: "Inválida",
      className: "text-red-600 bg-red-50 border-red-200"
    },
    expired: { 
      variant: "destructive" as const, 
      icon: AlertTriangle, 
      label: "Expirada",
      className: "text-red-600 bg-red-50 border-red-200"
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
