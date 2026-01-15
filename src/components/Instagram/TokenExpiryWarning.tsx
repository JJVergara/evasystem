import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface TokenExpiryWarningProps {
  daysUntilExpiry: number | null | undefined;
  showWarning: boolean | undefined;
  needsRefresh: boolean | undefined;
  isRefreshingToken: boolean;
  onRefresh: () => void;
}

export function TokenExpiryWarning({
  daysUntilExpiry,
  showWarning,
  needsRefresh,
  isRefreshingToken,
  onRefresh,
}: TokenExpiryWarningProps) {
  // Don't show if no warning needed
  if (!showWarning || daysUntilExpiry === null || daysUntilExpiry === undefined) {
    return null;
  }

  // Critical: 7 days or less (auto-refresh threshold)
  const isCritical = needsRefresh;

  return (
    <Alert
      className={
        isCritical
          ? 'border-red-500/50 bg-red-50 dark:bg-red-950/20'
          : 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20'
      }
    >
      {isCritical ? (
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
      ) : (
        <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      )}
      <AlertTitle
        className={
          isCritical ? 'text-red-800 dark:text-red-300' : 'text-yellow-800 dark:text-yellow-300'
        }
      >
        {isCritical ? 'Conexión próxima a expirar' : 'Token de Instagram expirando pronto'}
      </AlertTitle>
      <AlertDescription
        className={
          isCritical ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'
        }
      >
        <p className="mb-3">
          {daysUntilExpiry === 1
            ? 'Tu conexión con Instagram expira mañana.'
            : `Tu conexión con Instagram expira en ${daysUntilExpiry} días.`}
          {isCritical
            ? ' El sistema intentará renovarla automáticamente, pero puedes renovarla ahora para asegurar continuidad.'
            : ' Considera renovarla pronto para evitar interrupciones.'}
        </p>
        <Button
          variant={isCritical ? 'destructive' : 'outline'}
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshingToken}
          className={
            !isCritical
              ? 'border-yellow-500 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-400 dark:hover:bg-yellow-950'
              : ''
          }
        >
          {isRefreshingToken ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Renovando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Renovar ahora
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
