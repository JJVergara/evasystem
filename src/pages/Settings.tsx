import { MainLayout } from "@/components/Layout/MainLayout";
import SettingsContent from "@/components/Settings/SettingsContent";
import { PageHeader } from "@/components/Layout/PageHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";

const Settings = () => {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <MainLayout>
          <div className="space-y-6">
            <PageHeader 
              title="Configuración" 
              description="Gestiona la configuración de tu organización y conectividad"
            />
            <SettingsContent />
          </div>
        </MainLayout>
      </ErrorBoundary>
    </ProtectedRoute>
  );
};

export default Settings;