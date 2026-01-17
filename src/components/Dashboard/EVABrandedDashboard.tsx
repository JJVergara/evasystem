import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Instagram, Calendar, Users, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { SimpleDashboardContent } from './SimpleDashboardContent';

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
                  <AlertCircle className="h-5 w-5" />
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
                <Settings className="h-4 w-4" />
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
                        icon: Instagram,
                        label: 'Conectar Instagram',
                        action: () => navigate('/settings'),
                      };
                    case 'fiesta':
                      return {
                        icon: Calendar,
                        label: 'Crear Primera Fiesta',
                        action: () => navigate('/events'),
                      };
                    case 'ambassadors':
                      return {
                        icon: Users,
                        label: 'Añadir Embajadores',
                        action: () => navigate('/ambassadors'),
                      };
                    default:
                      return { icon: AlertCircle, label: step.title, action: () => {} };
                  }
                };

                const stepInfo = getStepInfo(step.id);
                const Icon = stepInfo.icon;

                return (
                  <Button
                    key={step.id}
                    variant="outline"
                    size="sm"
                    onClick={stepInfo.action}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Progreso de Configuración</CardTitle>
                <CardDescription>{Math.round(overallProgress)}% completado</CardDescription>
              </div>
              <Badge variant={overallProgress === 100 ? 'default' : 'secondary'}>
                {Math.round(overallProgress)}%
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
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
              <CheckCircle className="h-5 w-5 text-success" />
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
