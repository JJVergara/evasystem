import { MainLayout } from "@/components/Layout/MainLayout";
import { StoryInsightsDashboard } from "@/components/Analytics/StoryInsightsDashboard";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";

export default function Analytics() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <StoryInsightsDashboard />
      </MainLayout>
    </ProtectedRoute>
  );
}
