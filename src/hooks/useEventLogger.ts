
import { supabase } from "@/integrations/supabase/client";

export function useEventLogger() {
  const createLog = async (
    action: string,
    eventId?: string,
    details?: any
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.user.id)
        .single();

      if (userError) throw userError;

      // Por ahora solo loggeamos en consola ya que no tenemos tabla event_logs
      console.log('Event Log:', {
        user_id: userData.id,
        event_id: eventId,
        action: action,
        details: details || {},
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in createLog:', error);
    }
  };

  const createFeedback = async (
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    eventId?: string
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.user.id)
        .single();

      if (userError) throw userError;

      // Por ahora solo loggeamos en consola ya que no tenemos tabla feedback_cards
      console.log('Feedback Card:', {
        user_id: userData.id,
        event_id: eventId,
        type: type,
        message: message,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in createFeedback:', error);
    }
  };

  return {
    createLog,
    createFeedback
  };
}
