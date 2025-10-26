
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EnhancedAmbassadorDashboard } from "./EnhancedAmbassadorDashboard";
import { PageHeader } from "@/components/Layout/PageHeader";
import { GlassPanel } from "@/components/Layout/GlassPanel";

interface Ambassador {
  id: string;
  first_name: string;
  last_name: string;
  email?: string; // Optional - only available with manage_ambassadors permission
  instagram_user: string;
  organization_id: string;
  status: string;
  global_points: number;
  global_category: string;
  performance_status: string;
  events_participated: number;
  completed_tasks: number;
  failed_tasks: number;
  follower_count: number;
  created_at: string;
  rut?: string; // Optional - only available with manage_ambassadors permission
  date_of_birth?: string | null; // Optional - only available with manage_ambassadors permission
  profile_picture_url?: string | null; // Optional - only available with manage_ambassadors permission
}

export default function AmbassadorManagement() {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAmbassadors();
  }, []);

  const fetchAmbassadors = async () => {
    try {
      // Fetch basic ambassador data (non-sensitive)
      const { data: basicData, error: basicError } = await supabase
        .from('embassadors')
        .select('id, first_name, last_name, instagram_user, instagram_user_id, follower_count, global_points, global_category, performance_status, events_participated, completed_tasks, failed_tasks, organization_id, created_by_user_id, status, profile_public, last_instagram_sync, created_at')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (basicError) throw basicError;

       // For each ambassador, try to fetch sensitive data (will only work if user has manage_ambassadors permission)
       const ambassadorsWithSensitiveData = await Promise.all(
         (basicData || []).map(async (ambassador) => {
           try {
             const { data: sensitiveData } = await supabase
               .rpc('get_ambassador_sensitive_data', { ambassador_id: ambassador.id });
             
             // Define interface for sensitive data response
             interface SensitiveData {
               email?: string;
               date_of_birth?: string | null;
               rut?: string;
               profile_picture_url?: string | null;
             }
             
             const sensitive: SensitiveData = sensitiveData?.[0] || {};
             return {
               ...ambassador,
               email: sensitive.email || undefined,
               date_of_birth: sensitive.date_of_birth || null,
               rut: sensitive.rut || undefined,
               profile_picture_url: sensitive.profile_picture_url || null
             };
           } catch {
             // If user doesn't have permission, return without sensitive data
             return {
               ...ambassador,
               email: undefined,
               date_of_birth: null,
               rut: undefined,
               profile_picture_url: null
             };
           }
         })
       );

      setAmbassadors(ambassadorsWithSensitiveData);
    } catch (error) {
      console.error('Error fetching ambassadors:', error);
      toast.error('Error al cargar embajadores');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Embajadores" description="Cargando embajadores..." />
        <GlassPanel className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <div className="text-lg text-muted-foreground">Cargando embajadores...</div>
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Embajadores" 
        description="Gestiona y monitorea el rendimiento de tus embajadores"
      />
      <EnhancedAmbassadorDashboard 
        ambassadors={ambassadors}
        onRefresh={fetchAmbassadors}
      />
    </div>
  );
}
