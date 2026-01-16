import { supabase } from '@/integrations/supabase/client';
import type { Event, CreateEventInput, UpdateEventInput } from '@/types';

export async function getEvents(organizationId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select(
      `
      id, fiesta_id, organization_id, name, description,
      event_date, status, created_at, updated_at,
      fiestas (
        id,
        name
      )
    `
    )
    .eq('organization_id', organizationId)
    .order('event_date', { ascending: false });

  if (error) throw error;
  return (data || []) as Event[];
}

export async function getEventsByFiesta(fiestaId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('fiesta_id', fiestaId)
    .order('event_date', { ascending: false });

  if (error) throw error;
  return (data || []) as Event[];
}

export async function createEvent(organizationId: string, input: CreateEventInput): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      organization_id: organizationId,
      fiesta_id: input.fiesta_id,
      name: input.name,
      description: input.description || null,
      event_date: input.event_date || null,
      status: input.status || 'draft',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Event;
}

export async function updateEvent(input: UpdateEventInput): Promise<Event> {
  const { id, ...updates } = input;

  const { data, error } = await supabase
    .from('events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Event;
}

export async function deleteEvent(eventId: string): Promise<boolean> {
  const { error } = await supabase.from('events').delete().eq('id', eventId);

  if (error) throw error;
  return true;
}
