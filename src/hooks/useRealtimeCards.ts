
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SimpleActivity {
  id: string;
  type: string;
  message: string;
  created_at: string;
}

export const useRealtimeCards = () => {
  const [cards, setCards] = useState<SimpleActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
            id: `org-summary`,
            type: 'success',
            message: `Dashboard cargado: ${organizations.length} organización(es) activa(s)`,
            created_at: new Date().toISOString()
          });
        }

        setCards(activities);
      } catch (error) {
        console.error('Error generating activities:', error);
      } finally {
        setLoading(false);
      }
    };

    generateActivities();
  }, []);

  const markAsRead = async (cardId: string) => {
    setCards(prev => prev.filter(card => card.id !== cardId));
    toast.success('Actividad marcada como leída');
  };

  const refreshCards = async () => {
    setLoading(true);
    // Simular refresh
    setTimeout(() => {
      setLoading(false);
      toast.success('Actividades actualizadas');
    }, 500);
  };

  return { cards, loading, markAsRead, refreshCards };
};
