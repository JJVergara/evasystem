import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { EMOJIS } from '@/constants';
import { Check, ChevronRight } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

interface OnboardingProgressBarProps {
  steps: OnboardingStep[];
  overallProgress: number;
}

interface StepConfig {
  emoji: string;
  isImage?: boolean;
  route: string;
  completedLabel: string;
  pendingLabel: string;
  helpText: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

const stepConfig: Record<string, StepConfig> = {
  organization: {
    emoji: EMOJIS.entities.organization,
    route: '/settings',
    completedLabel: 'Organización lista',
    pendingLabel: 'Configura tu organización',
    helpText: 'Cambia el nombre, añade descripción o logo',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  instagram: {
    emoji: '/instagram-icon.webp',
    isImage: true,
    route: '/settings',
    completedLabel: 'Instagram conectado',
    pendingLabel: 'Conecta Instagram',
    helpText: 'Vincula tu cuenta Business de Instagram',
    color: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    borderColor: 'border-pink-200 dark:border-pink-800',
    textColor: 'text-pink-600 dark:text-pink-400',
  },
  fiesta: {
    emoji: EMOJIS.entities.fiesta,
    route: '/events',
    completedLabel: 'Primera fiesta creada',
    pendingLabel: 'Crea tu primera fiesta',
    helpText: 'Crea un evento para organizar embajadores',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  ambassadors: {
    emoji: EMOJIS.entities.ambassador,
    route: '/ambassadors',
    completedLabel: 'Embajadores añadidos',
    pendingLabel: 'Añade embajadores',
    helpText: 'Registra a tus primeros embajadores',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
};

export function OnboardingProgressBar({ steps, overallProgress }: OnboardingProgressBarProps) {
  const navigate = useNavigate();

  const sortedSteps = useMemo(() => {
    const completed = steps.filter((s) => s.completed);
    const pending = steps.filter((s) => !s.completed);
    return [...completed, ...pending];
  }, [steps]);

  const completedCount = steps.filter((s) => s.completed).length;
  const nextPendingStep = steps.find((s) => !s.completed);

  const handleStepClick = (step: OnboardingStep) => {
    const config = stepConfig[step.id];
    if (config) {
      navigate(config.route);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span>{EMOJIS.feedback.rocket}</span>
                Configuración de EVA System
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {completedCount === steps.length ? (
                  <span className="text-success font-medium flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    ¡Todo listo! Tu sistema está completamente configurado
                  </span>
                ) : (
                  <>
                    {completedCount} de {steps.length} pasos completados
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 bg-muted/50 rounded-full px-4 py-2 shrink-0">
              <div className="relative h-10 w-10">
                <svg className="h-10 w-10 transform -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-muted"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(overallProgress / 100) * 100.5} 100.5`}
                    className="text-primary transition-all duration-700 ease-out"
                  />
                </svg>
              </div>
              <span className="font-bold text-xl">{Math.round(overallProgress)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sortedSteps.map((step, index) => {
              const config = stepConfig[step.id];

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step)}
                  className={cn(
                    'relative flex flex-col items-center p-4 rounded-xl transition-all duration-200 group text-center border-2',
                    step.completed
                      ? `${config.bgColor} ${config.borderColor}`
                      : 'bg-muted/30 border-transparent hover:border-muted-foreground/20 hover:bg-muted/50'
                  )}
                >
                  <div className="relative">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
                        step.completed
                          ? config.color
                          : 'bg-muted-foreground/20 group-hover:bg-muted-foreground/30'
                      )}
                    >
                      {config.isImage ? (
                        <img
                          src={config.emoji}
                          alt={step.id}
                          className={cn('w-7 h-7', !step.completed && 'opacity-50 grayscale')}
                        />
                      ) : (
                        <span className={cn('text-2xl', !step.completed && 'grayscale opacity-60')}>
                          {config.emoji}
                        </span>
                      )}
                    </div>
                    {step.completed && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full flex items-center justify-center border-2 border-background">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 space-y-1">
                    <p
                      className={cn(
                        'text-xs sm:text-sm font-medium leading-tight',
                        step.completed ? config.textColor : 'text-foreground'
                      )}
                    >
                      {step.completed ? config.completedLabel : config.pendingLabel}
                    </p>
                    {!step.completed && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                        {config.helpText}
                      </p>
                    )}
                    {!step.required && !step.completed && (
                      <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
                        Opcional
                      </span>
                    )}
                  </div>

                  {!step.completed && (
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}

                  <span className="sr-only">
                    Paso {index + 1}: {step.title} - {step.completed ? 'Completado' : 'Pendiente'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {nextPendingStep && (
          <div className="border-t bg-muted/30 px-4 sm:px-6 py-3">
            <button
              onClick={() => handleStepClick(nextPendingStep)}
              className="w-full flex items-center justify-between text-sm group hover:text-primary transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">Continuar con:</span>
                <span className={cn('font-medium', stepConfig[nextPendingStep.id]?.textColor)}>
                  {stepConfig[nextPendingStep.id]?.pendingLabel}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
