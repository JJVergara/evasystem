import UserProfile from '@/components/Profile/UserProfile';
import { MembersManagement } from '@/components/Organizations/MembersManagement';
import { PageHeader } from '@/components/Layout/PageHeader';
import { EMOJIS } from '@/constants';

const Profile = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Perfil"
        description="Gestiona tu información personal y configuración de cuenta"
        emoji={EMOJIS.navigation.profile}
      />
      <UserProfile />
      <MembersManagement />
    </div>
  );
};

export default Profile;
