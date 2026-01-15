import { PageHeader } from '@/components/Layout/PageHeader';
import { InstagramBusinessDashboard } from '@/components/Instagram/InstagramBusinessDashboard';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';

export default function InstagramBusinessPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Instagram Business"
          description="Gestiona tu cuenta de Instagram Business y consulta métricas según la API de Meta"
        />
        <InstagramBusinessDashboard />
      </div>
    </ProtectedRoute>
  );
}
