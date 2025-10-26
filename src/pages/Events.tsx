
import { MainLayout } from "@/components/Layout/MainLayout";
import FiestasManagement from "@/components/Fiestas/FiestasManagement";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";

const Events = () => {
  return (
    <ProtectedRoute>
      <MainLayout>
        <FiestasManagement />
      </MainLayout>
    </ProtectedRoute>
  );
};

export default Events;
