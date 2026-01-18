import { Card, CardContent } from '@/components/ui/card';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { SimpleDashboardContent } from './SimpleDashboardContent';
import { OnboardingProgressBar } from './OnboardingProgressBar';
import { EMOJIS } from '@/constants';

export function EVABrandedDashboard() {
  const { steps, overallProgress } = useOnboardingStatus();

  const showProgressBar = overallProgress < 100;

  return (
    <div className="space-y-6">
      {showProgressBar ? (
        <OnboardingProgressBar steps={steps} overallProgress={overallProgress} />
      ) : (
        <Card className="border-success/30 bg-success/5 dark:bg-success/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">{EMOJIS.status.success}</span>
              <div>
                <p className="font-medium text-success">¡Configuración completa!</p>
                <p className="text-sm text-success/80">
                  Tu sistema EVA está completamente configurado y listo para usar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <SimpleDashboardContent />
    </div>
  );
}
