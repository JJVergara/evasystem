import { supabase } from '@/integrations/supabase/client';
import type {
  Ambassador,
  AmbassadorSensitiveData,
  CreateAmbassadorInput,
  UpdateAmbassadorInput,
} from '@/types';

export async function getAmbassadors(organizationId: string): Promise<Ambassador[]> {
  const { data, error } = await supabase
    .from('embassadors')
    .select(
      `
      id, first_name, last_name, instagram_user, instagram_user_id,
      follower_count, global_points, global_category, performance_status,
      events_participated, completed_tasks, failed_tasks, organization_id,
      created_by_user_id, status, profile_public, last_instagram_sync, created_at
    `
    )
    .eq('organization_id', organizationId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const withSensitiveData = await Promise.all(
    (data || []).map(async (ambassador) => {
      try {
        const { data: sensitiveData } = await supabase.rpc('get_ambassador_sensitive_data', {
          ambassador_id: ambassador.id,
        });
        const sensitive: AmbassadorSensitiveData = sensitiveData?.[0] || {};
        return {
          ...ambassador,
          email: sensitive.email || undefined,
          date_of_birth: sensitive.date_of_birth || null,
          rut: sensitive.rut || undefined,
          profile_picture_url: sensitive.profile_picture_url || null,
        };
      } catch {
        return {
          ...ambassador,
          email: undefined,
          date_of_birth: null,
          rut: undefined,
          profile_picture_url: null,
        };
      }
    })
  );

  return withSensitiveData as Ambassador[];
}

export async function createAmbassador(
  organizationId: string,
  input: CreateAmbassadorInput
): Promise<Ambassador> {
  const instagramUser = input.instagram_user.replace(/^@/, '');

  const { data, error } = await supabase
    .from('embassadors')
    .insert({
      organization_id: organizationId,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      instagram_user: instagramUser,
      date_of_birth: input.date_of_birth || null,
      rut: input.rut || null,
      status: 'active',
      performance_status: 'cumple',
      global_category: 'bronze',
      global_points: 0,
      events_participated: 0,
      completed_tasks: 0,
      failed_tasks: 0,
      follower_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Ambassador;
}

export async function updateAmbassador(input: UpdateAmbassadorInput): Promise<Ambassador> {
  const { id, ...updates } = input;

  if (updates.instagram_user) {
    updates.instagram_user = updates.instagram_user.replace(/^@/, '');
  }

  const { data, error } = await supabase
    .from('embassadors')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Ambassador;
}

export async function deleteAmbassador(ambassadorId: string): Promise<void> {
  const { error } = await supabase
    .from('embassadors')
    .update({ status: 'deleted' })
    .eq('id', ambassadorId);

  if (error) throw error;
}
