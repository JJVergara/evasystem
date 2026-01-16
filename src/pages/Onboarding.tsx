import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { useFiestas } from '@/hooks/useFiestas';
import { useInstagramConnection } from '@/hooks/useInstagramConnection';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Building,
  Users,
  PartyPopper,
  Instagram,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Edit3,
  Loader2,
} from 'lucide-react';
import { GlassPanel } from '@/components/Layout/GlassPanel';
import { PageHeader } from '@/components/Layout/PageHeader';
import { AppBackground } from '@/components/Layout/AppBackground';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  action?: () => void;
}

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading } = useUserProfile();
  const { organization, updateOrganization, loading: orgLoading } = useCurrentOrganization();
  const { fiestas } = useFiestas();
  const {
    isConnected: instagramConnected,
    connectInstagram,
    isConnecting,
  } = useInstagramConnection();
  const navigate = useNavigate();

  const [currentStep] = useState(0);
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);
  const [ambassadorCount, setAmbassadorCount] = useState(0);
  const [checkingAmbassadors, setCheckingAmbassadors] = useState(true);

  useEffect(() => {
    const checkAmbassadors = async () => {
      if (!organization?.id) return;

      try {
        const { count, error } = await supabase
          .from('embassadors')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id);

        if (error) {
          void ('Error checking ambassadors:', error);
        } else {
          setAmbassadorCount(count || 0);
        }
      } catch (error) {
        void ('Error checking ambassadors:', error);
      } finally {
        setCheckingAmbassadors(false);
      }
    };

    checkAmbassadors();
  }, [organization?.id]);

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || '');
      setOrgDescription(organization.description || '');
    }
  }, [organization]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleSaveOrganization = async () => {
    if (!orgName.trim()) {
      toast.error('El nombre de la organización es requerido');
      return;
    }

    setSavingOrg(true);
    const success = await updateOrganization({
      name: orgName.trim(),
      description: orgDescription.trim() || null,
    });

    if (success) {
      setEditingOrg(false);
      toast.success('Organización actualizada correctamente');
    }
    setSavingOrg(false);
  };

  const handleInstagramConnect = async () => {
    try {
      await connectInstagram();
    } catch (error) {
      void ('Error connecting Instagram:', error);
      toast.error('Error al conectar Instagram');
    }
  };

  const handleCreateFiesta = () => {
    navigate('/events');
  };

  const handleAddAmbassadors = () => {
    navigate('/ambassadors');
  };

  const steps: OnboardingStep[] = [
    {
      id: 'organization',
      title: 'Configura tu Organización',
      description: 'Dale un nombre y descripción a tu organización',
      icon: <Building className="h-6 w-6" />,
      completed: !!(organization?.name && organization.name !== 'Mi Organización'),
      action: () => setEditingOrg(true),
    },
    {
      id: 'instagram',
      title: 'Conecta Instagram',
      description: 'Vincula tu cuenta de Instagram para gestionar embajadores',
      icon: <Instagram className="h-6 w-6" />,
      completed: instagramConnected,
      action: handleInstagramConnect,
    },
    {
      id: 'fiesta',
      title: 'Crea tu Primera Fiesta',
      description: 'Configura tu primer evento para comenzar a gestionar embajadores',
      icon: <PartyPopper className="h-6 w-6" />,
      completed: fiestas.length > 0,
      action: handleCreateFiesta,
    },
    {
      id: 'ambassadors',
      title: 'Agrega Embajadores',
      description: 'Invita o importa tus primeros embajadores',
      icon: <Users className="h-6 w-6" />,
      completed: ambassadorCount > 0,
      action: handleAddAmbassadors,
    },
  ];

  const completedSteps = steps.filter((step) => step.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  const requiredSteps = steps.filter((step) => step.id === 'organization');
  const canAccessDashboard = requiredSteps.every((step) => step.completed);

  const handleFinishOnboarding = () => {
    navigate('/');
  };

  if (authLoading || profileLoading || orgLoading || checkingAmbassadors) {
    return (
      <AppBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Configurando tu experiencia...</span>
          </div>
        </div>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Configuración Inicial"
          description="Te guiaremos paso a paso para configurar tu cuenta EVA System"
        />

        <div className="space-y-8">
          <GlassPanel size="lg" className="text-center">
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-full">
                  <Sparkles className="h-12 w-12 text-white" />
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  ¡Bienvenido a EVA System!
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Tu plataforma inteligente para gestionar embajadores y eventos. Comencemos
                  configurando tu experiencia paso a paso.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progreso de configuración</span>
                  <span className="font-medium">
                    {completedSteps} de {steps.length} completados
                  </span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            </div>
          </GlassPanel>

          {editingOrg && (
            <GlassPanel className="border-purple-200 bg-purple-50/50">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Edit3 className="h-5 w-5 mr-2" />
                    Configura tu Organización
                  </h3>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Nombre de la Organización *</Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Ej: Productora Eventos Chile"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgDescription">Descripción</Label>
                    <Textarea
                      id="orgDescription"
                      value={orgDescription}
                      onChange={(e) => setOrgDescription(e.target.value)}
                      placeholder="Descripción de tu organización..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveOrganization}
                    disabled={savingOrg || !orgName.trim()}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
                  >
                    {savingOrg ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingOrg(false)}
                    disabled={savingOrg}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </GlassPanel>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {steps.map((step, index) => (
              <GlassPanel
                key={step.id}
                className={`relative transition-all duration-300 hover:shadow-xl ${
                  step.completed
                    ? 'border-green-200 bg-green-50/50'
                    : index === currentStep
                      ? 'border-purple-200 bg-purple-50/50 ring-2 ring-purple-100'
                      : 'hover:border-purple-100'
                }`}
              >
                {step.completed && (
                  <div className="absolute -top-2 -right-2">
                    <div className="bg-green-500 text-white p-1 rounded-full">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-3 rounded-lg ${
                        step.completed
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-600'
                      }`}
                    >
                      {step.icon}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{step.title}</h3>
                        <Badge variant={step.completed ? 'default' : 'secondary'}>
                          {step.completed ? 'Completado' : `Paso ${index + 1}`}
                        </Badge>
                      </div>

                      <p className="text-muted-foreground text-sm">{step.description}</p>
                    </div>
                  </div>

                  {!step.completed && (
                    <Button
                      onClick={step.action}
                      disabled={step.id === 'instagram' && isConnecting}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {step.id === 'instagram' && isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          Configurar Ahora
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </GlassPanel>
            ))}
          </div>

          {canAccessDashboard && (
            <GlassPanel className="text-center border-green-200 bg-green-50/50">
              <div className="space-y-4">
                <div className="bg-green-100 p-4 rounded-full w-fit mx-auto">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-green-800">¡Configuración Completada!</h3>
                  <p className="text-green-700">
                    Tu cuenta está lista. Ahora puedes comenzar a gestionar tus embajadores y
                    eventos.
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={handleFinishOnboarding}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Explorar Dashboard
                </Button>
              </div>
            </GlassPanel>
          )}

          {canAccessDashboard && completedSteps < steps.length && (
            <GlassPanel className="text-center">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">¡Excelente Progreso!</h3>
                <p className="text-muted-foreground">
                  Has completado {completedSteps} de {steps.length} pasos. Los pasos restantes son
                  opcionales y pueden completarse más tarde.
                </p>
              </div>
            </GlassPanel>
          )}
        </div>
      </div>
    </AppBackground>
  );
}
