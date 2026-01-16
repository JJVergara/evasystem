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

  const pendingRecommendedSteps = steps.filter((step) => !step.required && !step.completed);

  return (
    <div className="space-y-6">
      {pendingRecommendedSteps.length > 0 && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-400">
                  <AlertCircle className="h-5 w-5" />
                  Completa la configuración de tu sistema
                </CardTitle>
                <CardDescription className="text-blue-600 dark:text-blue-500">
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
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-800">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </CardHeader>
        </Card>
      )}

      {overallProgress === 100 && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-400">
                  ¡Configuración completa!
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">
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
