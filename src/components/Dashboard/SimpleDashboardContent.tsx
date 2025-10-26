
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, Users, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DashboardStats {
  totalOrganizations: number;
  totalEvents: number;
  totalAmbassadors: number;
}

export function SimpleDashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizations: 0,
    totalEvents: 0,
    totalAmbassadors: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Obtener organizaciones del usuario
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('created_by', user!.id);

      if (orgError) throw orgError;

      const organizationIds = organizations?.map(org => org.id) || [];
      
      // Obtener eventos de las organizaciones del usuario
      let totalEvents = 0;
      let totalAmbassadors = 0;

      if (organizationIds.length > 0) {
        const { data: fiestas, error: fiestasError } = await supabase
          .from('fiestas')
          .select('id')
          .in('organization_id', organizationIds);

        if (fiestasError) throw fiestasError;
        totalEvents = fiestas?.length || 0;

        const { data: ambassadors, error: ambassadorsError } = await supabase
          .from('embassadors')
          .select('id')
          .in('organization_id', organizationIds);

        if (ambassadorsError) throw ambassadorsError;
        totalAmbassadors = ambassadors?.length || 0;
      }

      setStats({
        totalOrganizations: organizations?.length || 0,
        totalEvents,
        totalAmbassadors
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Error al cargar estadísticas del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, description }: {
    title: string;
    value: number;
    icon: any;
    description: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{loading ? '...' : value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Resumen de tu actividad en el sistema EVA
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Organizaciones"
          value={stats.totalOrganizations}
          icon={Building2}
          description="Productoras registradas"
        />
        <StatCard
          title="Eventos"
          value={stats.totalEvents}
          icon={Calendar}
          description="Fiestas organizadas"
        />
        <StatCard
          title="Embajadores"
          value={stats.totalAmbassadors}
          icon={Users}
          description="Personas registradas"
        />
        <StatCard
          title="Sistema"
          value={1}
          icon={Activity}
          description="EVA funcionando"
        />
      </div>

      {stats.totalOrganizations === 0 && !loading && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">¡Bienvenido a EVA!</h3>
              <p className="text-muted-foreground mb-4">
                Para comenzar, crea tu primera organización o productora de eventos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
