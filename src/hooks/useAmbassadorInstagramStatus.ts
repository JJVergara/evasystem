import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AmbassadorInstagramStatus {
  isConnected: boolean;
  username: string | undefined;
  followerCount: number | undefined;
  lastSync: string | undefined;
}

async function fetchAmbassadorInstagramStatus(
  ambassadorId: string
): Promise<AmbassadorInstagramStatus> {
  // Check ambassador_tokens
  const { data: tokenRow, error: tokenError } = await supabase
    .from('ambassador_tokens')
    .select('token_expiry')
    .eq('embassador_id', ambassadorId)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return {
      isConnected: false,
      username: undefined,
      followerCount: undefined,
      lastSync: undefined,
    };
  }

  // Read public info from embassadors
  const { data: ambassador } = await supabase
    .from('embassadors')
    .select('instagram_user, follower_count, last_instagram_sync')
    .eq('id', ambassadorId)
    .maybeSingle();

  return {
    isConnected: true,
    username: ambassador?.instagram_user ?? undefined,
    followerCount: ambassador?.follower_count ?? undefined,
    lastSync: ambassador?.last_instagram_sync ?? undefined,
  };
}

export function useAmbassadorInstagramStatus(ambassadorId: string | null) {
  const { data: status, isLoading } = useQuery({
    queryKey: ['ambassadorInstagramStatus', ambassadorId],
    queryFn: () => fetchAmbassadorInstagramStatus(ambassadorId!),
    enabled: !!ambassadorId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });

  return {
    ...(status || {
      isConnected: false,
      username: undefined,
      followerCount: undefined,
      lastSync: undefined,
    }),
    loading: isLoading,
  };
}
