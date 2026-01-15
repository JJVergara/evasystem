/**
 * Fiesta API Service
 *
 * Abstracts Supabase operations for fiesta management.
 * Used by useFiestas hook.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Fiesta, CreateFiestaInput, UpdateFiestaInput } from '@/types';

/**
 * Fetch all fiestas for an organization
 */
export async function getFiestas(organizationId: string): Promise<Fiesta[]> {
  const { data, error } = await supabase
    .from('fiestas')
    .select(`
      id, organization_id, name, description, location, event_date,
      main_hashtag, secondary_hashtags, instagram_handle, status,
      created_at, updated_at
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Fiesta[];
}

/**
 * Create a new fiesta
 */
export async function createFiesta(
  organizationId: string,
  input: CreateFiestaInput
): Promise<Fiesta> {
  const { data, error } = await supabase
    .from('fiestas')
    .insert({
      organization_id: organizationId,
      name: input.name,
      description: input.description || null,
      event_date: input.event_date || null,
      location: input.location || null,
      main_hashtag: input.main_hashtag || null,
      secondary_hashtags: input.secondary_hashtags || null,
      status: input.status || 'draft',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Fiesta;
}

/**
 * Update a fiesta
 */
export async function updateFiesta(input: UpdateFiestaInput): Promise<Fiesta> {
  const { id, ...updates } = input;

  const { data, error } = await supabase
    .from('fiestas')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Fiesta;
}
