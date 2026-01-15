import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

export function ErrorMessage({
  title = 'Error',
  message,
  showRetry = true,
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <Card className="max-w-md text-center">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-center text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{message}</p>
          {showRetry && (
            <Button
              onClick={onRetry || (() => window.location.reload())}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
