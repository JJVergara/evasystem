import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrganization } from './useCurrentOrganization';

interface EventLog {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  details?: string;
  entity_type?: string;
  entity_id?: string;
}

export function useRealEventLogs() {
  const { organization } = useCurrentOrganization();
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization?.id) {
      fetchEventLogs();
    }
  }, [organization?.id]);

  const fetchEventLogs = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);

      // Generate event logs based on recent activity
      const logs: EventLog[] = [];

      // Recent ambassador activity
      const { data: recentAmbassadors } = await supabase
        .from('embassadors')
        .select('id, first_name, last_name, created_at, status')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(5);

      recentAmbassadors?.forEach(amb => {
        logs.push({
          id: `amb-${amb.id}`,
          type: amb.status === 'pending' ? 'warning' : 'info',
          message: `Embajador ${amb.first_name} ${amb.last_name} ${amb.status === 'pending' ? 'pendiente de aprobación' : 'registrado'}`,
          timestamp: amb.created_at,
          entity_type: 'ambassador',
          entity_id: amb.id
        });
      });

      // Recent task activity
      const { data: ambassadors } = await supabase
        .from('embassadors')
        .select('id')
        .eq('organization_id', organization.id);

      if (ambassadors && ambassadors.length > 0) {
        const { data: recentTasks } = await supabase
          .from('tasks')
          .select('id, status, created_at, last_status_update, embassador_id, embassadors(first_name, last_name)')
          .in('embassador_id', ambassadors.map(a => a.id))
          .order('last_status_update', { ascending: false })
          .limit(10);

        recentTasks?.forEach(task => {
          const ambassador = task.embassadors as any;
          logs.push({
            id: `task-${task.id}`,
            type: task.status === 'completed' ? 'success' : 
                  task.status === 'invalid' ? 'error' : 'info',
            message: `Tarea ${task.status} por ${ambassador?.first_name} ${ambassador?.last_name}`,
            timestamp: task.last_status_update || task.created_at,
            entity_type: 'task',
            entity_id: task.id
          });
        });
      }

      // Recent fiestas activity
      const { data: recentFiestas } = await supabase
        .from('fiestas')
        .select('id, name, created_at, status')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(3);

      recentFiestas?.forEach(fiesta => {
        logs.push({
          id: `fiesta-${fiesta.id}`,
          type: 'info',
          message: `Fiesta "${fiesta.name}" ${fiesta.status}`,
          timestamp: fiesta.created_at,
          entity_type: 'fiesta',
          entity_id: fiesta.id
        });
      });

      // Sort all logs by timestamp
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setLogs(logs.slice(0, 20)); // Keep only 20 most recent
    } catch (error) {
      console.error('Error fetching event logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    logs,
    loading,
    refreshLogs: fetchEventLogs
  };
}