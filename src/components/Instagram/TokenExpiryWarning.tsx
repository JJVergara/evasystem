import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

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
  if (!showWarning || daysUntilExpiry === null || daysUntilExpiry === undefined) {
    return null;
  }

  const isCritical = needsRefresh;

  return (
    <Alert
      className={
        isCritical
          ? 'border-destructive/50 bg-destructive/5 dark:bg-destructive/10'
          : 'border-warning/50 bg-warning/5 dark:bg-warning/10'
      }
    >
      {isCritical ? (
        <span className="text-destructive">⚠️</span>
      ) : (
        <span className="text-warning">🕐</span>
      )}
      <AlertTitle className={isCritical ? 'text-destructive' : 'text-warning'}>
        {isCritical ? 'Conexión próxima a expirar' : 'Token de Instagram expirando pronto'}
      </AlertTitle>
      <AlertDescription className={isCritical ? 'text-destructive/80' : 'text-warning/80'}>
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
          className={!isCritical ? 'border-warning text-warning hover:bg-warning/10' : ''}
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
