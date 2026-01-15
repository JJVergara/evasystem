import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFiestas } from './useFiestas';

interface Ambassador {
  id: string;
  first_name: string;
  last_name: string;
  instagram_user: string;
  global_category: string;
}

interface Event {
  id: string;
  name: string;
  main_hashtag: string;
}

async function fetchAmbassadorsForFiesta(fiestaId: string): Promise<Ambassador[]> {
  // Get organization from fiesta first
  const { data: fiestaData, error: fiestaError } = await supabase
    .from('fiestas')
    .select('organization_id')
    .eq('id', fiestaId)
    .single();

  if (fiestaError) throw fiestaError;

  const { data, error } = await supabase
    .from('embassadors')
    .select('id, first_name, last_name, instagram_user, global_category')
    .eq('organization_id', fiestaData.organization_id)
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function fetchEventsForFiesta(fiestaId: string): Promise<Event[]> {
  const { data, error } = await supabase.from('events').select('id').eq('fiesta_id', fiestaId);

  if (error) throw error;

  // Since events no longer have name, we'll use fiesta data
  const { data: fiestaData, error: fiestaError } = await supabase
    .from('fiestas')
    .select('name, main_hashtag')
    .eq('id', fiestaId)
    .single();

  if (fiestaError) throw fiestaError;

  return (
    data?.map((e) => ({
      id: e.id,
      name: fiestaData.name,
      main_hashtag: fiestaData.main_hashtag || '',
    })) || []
  );
}

export function useStoriesData() {
  const { selectedFiestaId } = useFiestas();

  const ambassadorsQueryKey = useMemo(
    () => ['storiesAmbassadors', selectedFiestaId],
    [selectedFiestaId]
  );

  const eventsQueryKey = useMemo(() => ['storiesEvents', selectedFiestaId], [selectedFiestaId]);

  const { data: ambassadors = [], isLoading: ambassadorsLoading } = useQuery({
    queryKey: ambassadorsQueryKey,
    queryFn: () => fetchAmbassadorsForFiesta(selectedFiestaId!),
    enabled: !!selectedFiestaId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    placeholderData: keepPreviousData,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: eventsQueryKey,
    queryFn: () => fetchEventsForFiesta(selectedFiestaId!),
    enabled: !!selectedFiestaId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    placeholderData: keepPreviousData,
  });

  return {
    ambassadors,
    events,
    loading:
      (ambassadorsLoading && ambassadors.length === 0) || (eventsLoading && events.length === 0),
  };
}
