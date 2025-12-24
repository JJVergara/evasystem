
import { corsHeaders, STORY_INSIGHTS_METRICS, INSTAGRAM_API_BASE, VERIFICATION_INTERVALS, STORY_EXPIRATION_MS } from '../shared/constants.ts';
import { MentionUpdateData, InsightsMap, SupabaseClient } from '../shared/types.ts';
import { corsPreflightResponse, jsonResponse, errorResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';
import { handleError } from '../shared/error-handler.ts';
import { safeDecryptToken } from '../shared/crypto.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const supabase = createSupabaseClient();

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
                    `${INSTAGRAM_API_BASE}/${mention.instagram_story_id}?fields=id&access_token=${decryptedToken}`
                  );
                  storyExists = response.ok;
                } catch (error) {
                  console.error(`Error checking story ${mention.instagram_story_id}:`, error);
                }
              }
            }

            // Update checks count and last check time
            const newChecksCount = mention.checks_count + 1;
            const updateData: MentionUpdateData = {
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
          // Try to collect final insights snapshot before marking as completed
          let finalSnapshotCreated = false;
          
          // Get organization tokens for final insights collection
          const { data: tokenInfo } = await supabase
            .from('organization_instagram_tokens')
            .select('access_token, token_expiry')
            .eq('organization_id', mention.organization_id)
            .single();

          if (tokenInfo?.access_token && mention.instagram_story_id) {
            try {
              const decryptedToken = await safeDecryptToken(tokenInfo.access_token);
              
              // Try to fetch final insights (story might still be available for a short time after 24h)
              const insightsUrl = `${INSTAGRAM_API_BASE}/${mention.instagram_story_id}/insights?metric=${STORY_INSIGHTS_METRICS}&access_token=${decryptedToken}`;
              const insightsResponse = await fetch(insightsUrl);
              
              if (insightsResponse.ok) {
                const insightsData = await insightsResponse.json();
                
                // Parse insights
                const insights: InsightsMap = {};
                for (const metric of insightsData.data || []) {
                  insights[metric.name] = metric.values?.[0]?.value || 0;
                }
                
                // Create final snapshot
                const finalSnapshot = {
                  social_mention_id: mention.id,
                  organization_id: mention.organization_id,
                  instagram_story_id: mention.instagram_story_id,
                  instagram_media_id: mention.instagram_story_id,
                  snapshot_at: new Date().toISOString(),
                  story_age_hours: 24, // Final snapshot at 24h
                  impressions: insights.impressions || 0,
                  reach: insights.reach || 0,
                  replies: insights.replies || 0,
                  exits: insights.exits || 0,
                  taps_forward: insights.taps_forward || 0,
                  taps_back: insights.taps_back || 0,
                  shares: insights.shares || 0,
                  navigation: {},
                  raw_insights: insightsData
                };
                
                const { error: snapshotError } = await supabase
                  .from('story_insights_snapshots')
                  .insert(finalSnapshot);
                
                if (!snapshotError) {
                  finalSnapshotCreated = true;
                  console.log(`Created final insights snapshot for story ${mention.instagram_story_id}`);
                } else {
                  console.error(`Error creating final snapshot:`, snapshotError);
                }
              }
            } catch (error) {
              console.error(`Error fetching final insights for story ${mention.instagram_story_id}:`, error);
            }
          }

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
          const notificationMessage = finalSnapshotCreated
            ? `Historia de @${mention.instagram_username || 'usuario desconocido'} completó su ciclo de 24h (insights finales guardados)`
            : `Historia de @${mention.instagram_username || 'usuario desconocido'} completó su ciclo de 24h naturalmente`;
            
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              organization_id: mention.organization_id,
              type: 'story_mention_completed',
              message: notificationMessage,
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

    return jsonResponse({ 
      success: true,
      verified: verificationCount,
      processed: processedCount,
      notifications_sent: notificationCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleError(error);
  }
});
