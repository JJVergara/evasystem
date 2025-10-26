import { MainLayout } from "@/components/Layout/MainLayout";
import { AdvancedDashboard } from "@/components/Analytics/AdvancedDashboard";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";

export default function Analytics() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <AdvancedDashboard />
      </MainLayout>
    </ProtectedRoute>
  );
}