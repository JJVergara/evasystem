import { useMemo } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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

async function fetchEventLogs(organizationId: string): Promise<EventLog[]> {
  const logs: EventLog[] = [];

  // Recent ambassador activity
  const { data: recentAmbassadors } = await supabase
    .from('embassadors')
    .select('id, first_name, last_name, created_at, status')
    .eq('organization_id', organizationId)
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
    .eq('organization_id', organizationId);

  if (ambassadors && ambassadors.length > 0) {
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('id, status, created_at, last_status_update, embassador_id, embassadors(first_name, last_name)')
      .in('embassador_id', ambassadors.map(a => a.id))
      .order('last_status_update', { ascending: false })
      .limit(10);

    recentTasks?.forEach(task => {
      const ambassador = task.embassadors as { first_name: string; last_name: string } | null;
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
    .eq('organization_id', organizationId)
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

  return logs.slice(0, 20); // Keep only 20 most recent
}

export function useRealEventLogs() {
  const { organization } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ['eventLogs', organization?.id],
    [organization?.id]
  );

  const { data: logs = [], isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchEventLogs(organization!.id),
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    placeholderData: keepPreviousData,
  });

  const refreshLogs = async () => {
    await refetch();
  };

  return {
    logs,
    loading: loading && logs.length === 0,
    refreshLogs
  };
}
