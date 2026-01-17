import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { SimpleDashboardContent } from './SimpleDashboardContent';
import { EMOJIS } from '@/constants';

export function EVABrandedDashboard() {
  const navigate = useNavigate();
  const { steps, overallProgress } = useOnboardingStatus();

  const pendingRecommendedSteps = useMemo(
    () => steps.filter((step) => !step.required && !step.completed),
    [steps]
  );

  return (
    <div className="space-y-6">
      {pendingRecommendedSteps.length > 0 && (
        <Card className="border-info/30 bg-info/5 dark:bg-info/10">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-info">
                  <span>{EMOJIS.feedback.bulb}</span>
                  Completa la configuración de tu sistema
                </CardTitle>
                <CardDescription className="text-info/80">
                  Tienes {pendingRecommendedSteps.length} paso
                  {pendingRecommendedSteps.length !== 1 ? 's' : ''} recomendado
                  {pendingRecommendedSteps.length !== 1 ? 's' : ''} pendiente
                  {pendingRecommendedSteps.length !== 1 ? 's' : ''} para aprovechar al máximo EVA
                  System
                </CardDescription>
              </div>
              <Button
                onClick={() => navigate('/onboarding')}
                className="gap-2 w-full sm:w-auto text-sm sm:text-base shrink-0"
              >
                <span>{EMOJIS.feedback.rocket}</span>
                <span className="hidden sm:inline">Completar Configuración</span>
                <span className="sm:hidden">Completar</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pendingRecommendedSteps.map((step) => {
                const getStepInfo = (stepId: string) => {
                  switch (stepId) {
                    case 'instagram':
                      return {
                        emoji: EMOJIS.entities.story,
                        label: 'Conectar Instagram',
                        action: () => navigate('/settings'),
                      };
                    case 'fiesta':
                      return {
                        emoji: EMOJIS.navigation.events,
                        label: 'Crear Primera Fiesta',
                        action: () => navigate('/events'),
                      };
                    case 'ambassadors':
                      return {
                        emoji: EMOJIS.navigation.ambassadors,
                        label: 'Añadir Embajadores',
                        action: () => navigate('/ambassadors'),
                      };
                    default:
                      return { emoji: EMOJIS.entities.task, label: step.title, action: () => {} };
                  }
                };

                const stepInfo = getStepInfo(step.id);

                return (
                  <Button
                    key={step.id}
                    variant="outline"
                    size="sm"
                    onClick={stepInfo.action}
                    className="gap-2"
                  >
                    <span>{stepInfo.emoji}</span>
                    {stepInfo.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {overallProgress < 100 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base sm:text-lg">Progreso de Configuración</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {Math.round(overallProgress)}% completado
                </CardDescription>
              </div>
              <Badge
                variant={overallProgress === 100 ? 'default' : 'secondary'}
                className="self-start sm:self-auto"
              >
                {Math.round(overallProgress)}%
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2 sm:mt-0">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </CardHeader>
        </Card>
      )}

      {overallProgress === 100 && (
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
