import { useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import AmbassadorManagement from "@/components/Ambassadors/AmbassadorManagement";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { toast } from "sonner";

const Ambassadors = () => {
  // Handle Instagram connection callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const error = params.get('error');

    if (status === 'success') {
      toast.success('Instagram conectado exitosamente', {
        description: 'La cuenta de Instagram del embajador ha sido vinculada correctamente'
      });
      
      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      window.history.replaceState({}, '', url.toString());
    } else if (status === 'error' && error) {
      toast.error('Error al conectar Instagram', {
        description: decodeURIComponent(error)
      });
      
      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  return (
    <ProtectedRoute>
      <MainLayout>
        <AmbassadorManagement />
      </MainLayout>
    </ProtectedRoute>
  );
};

export default Ambassadors;