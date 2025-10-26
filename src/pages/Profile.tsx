import { MainLayout } from "@/components/Layout/MainLayout";
import UserProfile from "@/components/Profile/UserProfile";
import { MembersManagement } from "@/components/Organizations/MembersManagement";
import { PageHeader } from "@/components/Layout/PageHeader";

const Profile = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Mi Perfil" 
          description="Gestiona tu información personal y configuración de cuenta"
        />
        <UserProfile />
        <MembersManagement />
      </div>
    </MainLayout>
  );
};

export default Profile;