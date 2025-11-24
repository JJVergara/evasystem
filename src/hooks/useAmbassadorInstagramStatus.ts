import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAmbassadorInstagramStatus(ambassadorId: string | null) {
    const [status, setStatus] = useState({
      isConnected: false,
      username: undefined as string | undefined,
      followerCount: undefined as number | undefined,
      lastSync: undefined as string | undefined,
    });
  
    useEffect(() => {
      if (!ambassadorId) return; // nothing to do yet
  
      let cancelled = false;
  
      async function load() {
        // 1) check ambassador_tokens
        const { data: tokenRow, error: tokenError } = await supabase
          .from("ambassador_tokens")
          .select("token_expiry")
          .eq("embassador_id", ambassadorId)
          .maybeSingle();
  
        if (tokenError || !tokenRow) {
          if (!cancelled) setStatus(prev => ({ ...prev, isConnected: false }));
          return;
        }
  
        // 2) read public info from embassadors
        const { data: ambassador, error: ambError } = await supabase
          .from("embassadors")
          .select("instagram_user, follower_count, last_instagram_sync")
          .eq("id", ambassadorId)
          .maybeSingle();
  
        if (!cancelled) {
          setStatus({
            isConnected: true,
            username: ambassador?.instagram_user ?? undefined,
            followerCount: ambassador?.follower_count ?? undefined,
            lastSync: ambassador?.last_instagram_sync ?? undefined,
          });
        }
      }
  
      load();
  
      return () => {
        cancelled = true;
      };
    }, [ambassadorId]);
  
    return status;
  }
  
