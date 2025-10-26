import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Building2, Instagram, Calendar, Users, ArrowRight, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import EditOrganizationModal from "@/components/Organizations/EditOrganizationModal";
import { CreateFiestaModal } from "@/components/Fiestas/CreateFiestaModal";
import AddAmbassadorModal from "@/components/Ambassadors/AddAmbassadorModal";
import { MetaAppCredentialsForm } from "@/components/Settings/MetaAppCredentialsForm";
import { InstagramConfigGuide } from "@/components/Settings/InstagramConfigGuide";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";

const stepIcons = {
  organization: Building2,
  instagram: Instagram,
  fiesta: Calendar,
  ambassadors: Users,
};

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { steps, overallProgress, canAccessDashboard, refreshOnboardingStatus } = useOnboardingStatus();
  const { organization, refreshOrganization } = useCurrentOrganization();
  
  const [showEditOrganization, setShowEditOrganization] = useState(false);
  const [showCreateFiesta, setShowCreateFiesta] = useState(false);
  const [showAddAmbassador, setShowAddAmbassador] = useState(false);
  const [showInstagramConfig, setShowInstagramConfig] = useState(false);
  const [showInstagramGuide, setShowInstagramGuide] = useState(false);

  const handleStepAction = (stepId: string) => {
    switch (stepId) {
      case "organization":
        setShowEditOrganization(true);
        break;
      case "instagram":
        setShowInstagramConfig(true);
        break;
      case "fiesta":
        setShowCreateFiesta(true);
        break;
      case "ambassadors":
        setShowAddAmbassador(true);
        break;
    }
  };

  const handleGoToDashboard = () => {
    navigate('/');
  };

  const handleModalClose = () => {
    setShowEditOrganization(false);
    setShowCreateFiesta(false);
    setShowAddAmbassador(false);
    setShowInstagramConfig(false);
    setShowInstagramGuide(false);
    refreshOnboardingStatus();
    refreshOrganization();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              ¡Bienvenido a EVA System! 🎉
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Configura tu sistema de gestión de embajadores en pocos pasos
            </p>
            
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progreso General</span>
                <span className="text-sm text-muted-foreground">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>

            {/* Dashboard Access Button - Show when can access */}
            {canAccessDashboard && (
              <div className="mb-6">
                <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div className="text-left">
                          <p className="font-medium text-green-800 dark:text-green-400">
                            ¡Tu organización está lista!
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-500">
                            Ya puedes acceder al dashboard y explorar todas las funcionalidades
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleGoToDashboard} className="gap-2">
                        <Home className="h-4 w-4" />
                        Ir al Dashboard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = stepIcons[step.id as keyof typeof stepIcons];
              const isCompleted = step.completed;
              const isRequired = step.required;

              return (
                <Card key={step.id} className={`transition-all ${
                  isCompleted ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' : 
                  isRequired ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-900/10' :
                  'border-blue-200 bg-blue-50/50 dark:bg-blue-900/10'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isCompleted ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' :
                          isRequired ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400' :
                          'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{step.title}</CardTitle>
                            {!isRequired && (
                              <Badge variant="secondary" className="text-xs">
                                Opcional
                              </Badge>
                            )}
                            {isCompleted && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <CardDescription>{step.description}</CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {step.id === "instagram" && !isCompleted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowInstagramGuide(true)}
                          >
                            Ver Guía
                          </Button>
                        )}
                        <Button
                          onClick={() => handleStepAction(step.id)}
                          variant={isCompleted ? "outline" : "default"}
                          size="sm"
                          className="gap-2"
                        >
                          {isCompleted ? "Modificar" : "Configurar"}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Los pasos marcados como "Opcional" pueden completarse más tarde desde el dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditOrganizationModal
        isOpen={showEditOrganization}
        onClose={handleModalClose}
        onOrganizationUpdated={handleModalClose}
        organization={organization ? {
          ...organization,
          description: organization.description || ''
        } : undefined}
      />

      <CreateFiestaModal
        isOpen={showCreateFiesta}
        onClose={handleModalClose}
        onFiestaCreated={handleModalClose}
      />

      <AddAmbassadorModal
        isOpen={showAddAmbassador}
        onClose={handleModalClose}
        onAmbassadorAdded={handleModalClose}
      />

      <MetaAppCredentialsForm
        isOpen={showInstagramConfig}
        onClose={handleModalClose}
        onCredentialsSaved={handleModalClose}
      />

      <InstagramConfigGuide
        isOpen={showInstagramGuide}
        onClose={() => setShowInstagramGuide(false)}
      />
    </div>
  );
}
