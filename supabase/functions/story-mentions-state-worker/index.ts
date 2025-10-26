
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeDecryptToken } from '../shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const { source = 'manual', type = 'expiry' } = body;
    
    console.log(`Story mentions state worker started at: ${new Date().toISOString()}, source: ${source}, type: ${type}`);

    let processedCount = 0;
    let notificationCount = 0;
    let verificationCount = 0;

    if (type === 'verification') {
      // Handle story verification at different intervals (1h, 12h, 23h)
      const now = new Date();
      const currentMinutes = now.getMinutes();
      
      // Define verification intervals in minutes since mention creation
      const intervals = [60, 720, 1380]; // 1h, 12h, 23h
      
      for (const intervalMinutes of intervals) {
        const targetTime = new Date(now.getTime() - intervalMinutes * 60 * 1000);
        const windowStart = new Date(targetTime.getTime() - 30 * 60 * 1000); // 30 min before
        const windowEnd = new Date(targetTime.getTime() + 30 * 60 * 1000);   // 30 min after
        
        const { data: mentionsToVerify, error: verifyError } = await supabase
          .from('social_mentions')
          .select('id, organization_id, instagram_username, instagram_user_id, instagram_story_id, mentioned_at, expires_at, checks_count, story_url')
          .eq('mention_type', 'story_referral')
          .eq('state', 'new')
          .lt('checks_count', 3)
          .gte('mentioned_at', windowStart.toISOString())
          .lte('mentioned_at', windowEnd.toISOString());

        if (verifyError) {
          console.error(`Error fetching mentions for ${intervalMinutes}min verification:`, verifyError);
          continue;
        }

        console.log(`Found ${mentionsToVerify?.length || 0} mentions for ${intervalMinutes}min verification`);

        for (const mention of mentionsToVerify || []) {
          try {
            // Get organization tokens
            const { data: tokenInfo } = await supabase
              .from('organization_instagram_tokens')
              .select('access_token, token_expiry')
              .eq('organization_id', mention.organization_id)
              .single();

            let storyExists = false;
            
            if (tokenInfo?.access_token && (!tokenInfo.token_expiry || new Date(tokenInfo.token_expiry) > now)) {
              // Try to verify if story still exists
              if (mention.instagram_story_id) {
                try {
                  const decryptedToken = await safeDecryptToken(tokenInfo.access_token);
                  const response = await fetch(
                    `https://graph.facebook.com/v18.0/${mention.instagram_story_id}?fields=id&access_token=${decryptedToken}`
                  );
                  storyExists = response.ok;
                } catch (error) {
                  console.error(`Error checking story ${mention.instagram_story_id}:`, error);
                }
              }
            }

            // Update checks count and last check time
            const newChecksCount = mention.checks_count + 1;
            const updateData: any = {
              checks_count: newChecksCount,
              last_check_at: now.toISOString()
            };

            // Determine if story was deleted early (before 24h and not found)
            const mentionAge = now.getTime() - new Date(mention.mentioned_at).getTime();
            const is24Hours = mentionAge >= 24 * 60 * 60 * 1000;
            
            if (!storyExists && !is24Hours) {
              updateData.state = 'flagged_early_delete';
              updateData.processed = true;
              updateData.processed_at = now.toISOString();
            }

            const { error: updateError } = await supabase
              .from('social_mentions')
              .update(updateData)
              .eq('id', mention.id);

            if (updateError) {
              console.error(`Error updating mention ${mention.id}:`, updateError);
            } else {
              verificationCount++;
              
              if (updateData.state === 'flagged_early_delete') {
                // Create notification for early deletion
                await supabase
                  .from('notifications')
                  .insert({
                    organization_id: mention.organization_id,
                    type: 'story_early_delete',
                    message: `Historia de @${mention.instagram_username || 'usuario desconocido'} fue eliminada antes de 24h`,
                    target_type: 'story_mention',
                    target_id: mention.id,
                    priority: 'medium'
                  });
                notificationCount++;
              }
            }

          } catch (error) {
            console.error(`Error verifying mention ${mention.id}:`, error);
          }
        }
      }
    }

    // Find all story mentions that have expired (past 24h) and are still in 'new' state
    const { data: expiredMentions, error: expiredError } = await supabase
      .from('social_mentions')
      .select('id, organization_id, instagram_username, mentioned_at, expires_at')
      .eq('mention_type', 'story_referral')
      .eq('state', 'new')
      .lt('expires_at', new Date().toISOString());

    if (expiredError) {
      console.error('Error fetching expired mentions:', expiredError);
    } else {
      console.log(`Found ${expiredMentions?.length || 0} expired story mentions to process`);

      // Process each expired mention
      for (const mention of expiredMentions || []) {
        try {
          // Update state to 'completed' (natural 24h expiration)
          const { error: updateError } = await supabase
            .from('social_mentions')
            .update({ 
              state: 'completed',
              processed: true,
              processed_at: new Date().toISOString()
            })
            .eq('id', mention.id);

          if (updateError) {
            console.error(`Error updating mention ${mention.id}:`, updateError);
            continue;
          }

          processedCount++;

          // Create notification for completed story mention (low priority)
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              organization_id: mention.organization_id,
              type: 'story_mention_completed',
              message: `Historia de @${mention.instagram_username || 'usuario desconocido'} completó su ciclo de 24h naturalmente`,
              target_type: 'story_mention',
              target_id: mention.id,
              priority: 'low'
            });

          if (!notificationError) {
            notificationCount++;
          }

        } catch (error) {
          console.error(`Error processing expired mention ${mention.id}:`, error);
        }
      }
    }

    console.log(`Story mentions worker completed. Verified: ${verificationCount}, Expired processed: ${processedCount}, Notifications sent: ${notificationCount}`);

    return new Response(JSON.stringify({ 
      success: true,
      verified: verificationCount,
      processed: processedCount,
      notifications_sent: notificationCount,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Story mentions worker error:', error);
    return new Response(JSON.stringify({ 
      error: 'Worker failed', 
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
