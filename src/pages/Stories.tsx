import { MainLayout } from "@/components/Layout/MainLayout";
import StoriesManagement from "@/components/Stories/StoriesManagement";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";

const Stories = () => {
  return (
    <ProtectedRoute>
      <MainLayout>
        <StoriesManagement />
      </MainLayout>
    </ProtectedRoute>
  );
};

export default Stories;