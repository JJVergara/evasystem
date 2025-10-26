
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EVABrandedDashboard } from "@/components/Dashboard/EVABrandedDashboard";
import { MainLayout } from "@/components/Layout/MainLayout";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const navigate = useNavigate();

  // Redirect authenticated users from auth page
  useEffect(() => {
    if (!authLoading && user && window.location.pathname === '/auth') {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  return (
    <ProtectedRoute>
      <MainLayout>
        {/* Mostrar loading mientras se cargan las organizaciones */}
        {orgLoading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground animate-pulse">Cargando organizaciones...</p>
            </div>
          </div>
        ) : (
          <EVABrandedDashboard />
        )}
      </MainLayout>
    </ProtectedRoute>
  );
}
