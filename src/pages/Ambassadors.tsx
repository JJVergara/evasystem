import { MainLayout } from "@/components/Layout/MainLayout";
import AmbassadorManagement from "@/components/Ambassadors/AmbassadorManagement";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";

const Ambassadors = () => {
  return (
    <ProtectedRoute>
      <MainLayout>
        <AmbassadorManagement />
      </MainLayout>
    </ProtectedRoute>
  );
};

export default Ambassadors;