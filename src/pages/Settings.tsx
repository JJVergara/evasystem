import SettingsContent from "@/components/Settings/SettingsContent";
import { PageHeader } from "@/components/Layout/PageHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";

const Settings = () => {
  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <PageHeader
          title="Configuración"
          description="Gestiona la configuración de tu organización y conectividad"
        />
        <SettingsContent />
      </div>
    </ErrorBoundary>
  );
};

export default Settings;