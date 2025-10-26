
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SimpleActivity {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  created_at: string;
}

export default function FeedbackCards() {
  const [activities, setActivities] = useState<SimpleActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateActivities();
  }, []);

  const generateActivities = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Generar actividades basadas en los datos existentes
      const activities: SimpleActivity[] = [];

      // Verificar organizaciones del usuario
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, description, timezone, logo_url, plan_type, instagram_username, facebook_page_id, instagram_business_account_id, instagram_user_id, last_instagram_sync, created_by, created_at')
        .eq('created_by', user.user.id);

      if (!orgError && organizations && organizations.length > 0) {
        activities.push({
          id: `org-${Date.now()}`,
          type: 'success',
          message: `Tienes ${organizations.length} organización(es) activa(s)`,
          created_at: new Date().toISOString()
        });

        // Para cada organización, verificar eventos
        for (const org of organizations) {
          // Verificar embajadores
          const { data: ambassadors } = await supabase
            .from('embassadors')
            .select('id, first_name, last_name, email, instagram_user, organization_id, status')
            .eq('organization_id', org.id);

          if (ambassadors && ambassadors.length > 0) {
            activities.push({
              id: `ambassadors-${org.id}`,
              type: 'success',
              message: `${org.name}: ${ambassadors.length} embajador(es) registrado(s)`,
              created_at: new Date().toISOString()
            });
          }
        }
      } else {
        activities.push({
          id: 'no-org',
          type: 'warning',
          message: 'No tienes organizaciones creadas. ¡Crea una para empezar!',
          created_at: new Date().toISOString()
        });
      }

      setActivities(activities);
    } catch (error) {
      console.error('Error generating activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissActivity = (activityId: string) => {
    setActivities(prev => prev.filter(activity => activity.id !== activityId));
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getActivityStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-6">
      {activities.map((activity) => (
        <Alert key={activity.id} className={getActivityStyle(activity.type)}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              {getActivityIcon(activity.type)}
              <AlertDescription className="flex-1">
                {activity.message}
              </AlertDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissActivity(activity.id)}
              className="h-auto p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}
