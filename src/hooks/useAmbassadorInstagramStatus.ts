// src/hooks/useAmbassadorInstagramStatus.ts
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AmbassadorInstagramStatus {
  isConnected: boolean;
  username?: string;
  followerCount?: number;
  lastSync?: string;
}

export function useAmbassadorInstagramStatus(ambassadorId?: string) {
  const [status, setStatus] = useState<AmbassadorInstagramStatus>({
    isConnected: false,
  });

  useEffect(() => {
    if (!ambassadorId) return;

    let cancelled = false;

    const fetchStatus = async () => {
      // 1) check for a valid token
      const { data: tokenRow, error: tokenError } = await supabase
        .from("ambassador_tokens")
        .select("token_expiry")
        .eq("embassador_id", ambassadorId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (tokenError) {
        console.error("Error fetching ambassador token:", tokenError);
        setStatus({ isConnected: false });
        return;
      }

      const hasValidToken =
        !!tokenRow?.token_expiry &&
        new Date(tokenRow.token_expiry) > new Date();

      if (!hasValidToken) {
        setStatus({ isConnected: false });
        return;
      }

      // 2) fetch public IG info for display
      const { data: ambassador, error: ambassadorError } = await supabase
        .from("embassadors")
        .select(
          "instagram_user, follower_count, last_instagram_sync"
        )
        .eq("id", ambassadorId)
        .maybeSingle();

      if (cancelled) return;

      if (ambassadorError || !ambassador) {
        console.error("Error fetching ambassador:", ambassadorError);
        setStatus({ isConnected: hasValidToken });
        return;
      }

      setStatus({
        isConnected: hasValidToken,
        username: ambassador.instagram_user ?? undefined,
        followerCount: ambassador.follower_count ?? undefined,
        lastSync: ambassador.last_instagram_sync ?? undefined,
      });
    };

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, [ambassadorId]);

  return status;
}
