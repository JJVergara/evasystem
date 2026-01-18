import {
  STORY_INSIGHTS_METRICS,
  INSTAGRAM_API_BASE,
  VERIFICATION_INTERVALS,
  MAX_VERIFICATION_CHECKS,
} from '../shared/constants.ts';
import type { MentionUpdateData, InsightsMap, AccountVisibility } from '../shared/types.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';
import { handleError } from '../shared/error-handler.ts';
import { safeDecryptToken } from '../shared/crypto.ts';
import { verifyStoryExists, type StoryVerificationResult } from '../shared/instagram-api.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const supabase = createSupabaseClient();

    const body = await req.json().catch(() => ({}));
    const { source = 'manual', type = 'expiry' } = body;

    let processedCount = 0;
    let notificationCount = 0;
    let verificationCount = 0;
    let permissionRequestCount = 0;

    if (type === 'verification') {
      const now = new Date();

      for (const intervalMinutes of VERIFICATION_INTERVALS) {
        const targetTime = new Date(now.getTime() - intervalMinutes * 60 * 1000);
        const windowStart = new Date(targetTime.getTime() - 30 * 60 * 1000);
        const windowEnd = new Date(targetTime.getTime() + 30 * 60 * 1000);

        const { data: mentionsToVerify, error: verifyError } = await supabase
          .from('social_mentions')
          .select(
            'id, organization_id, instagram_username, instagram_user_id, instagram_story_id, mentioned_at, expires_at, checks_count, story_url, matched_ambassador_id, account_visibility, permission_requested_at'
          )
          .eq('mention_type', 'story_referral')
          .eq('state', 'new')
          .lt('checks_count', MAX_VERIFICATION_CHECKS)
          .gte('mentioned_at', windowStart.toISOString())
          .lte('mentioned_at', windowEnd.toISOString());

        if (verifyError) {
          continue;
        }

        for (const mention of mentionsToVerify || []) {
          try {
            const { data: tokenInfo } = await supabase
              .from('organization_instagram_tokens')
              .select('access_token, token_expiry')
              .eq('organization_id', mention.organization_id)
              .single();

            let verificationResult: StoryVerificationResult = 'network_error';

            if (
              tokenInfo?.access_token &&
              (!tokenInfo.token_expiry || new Date(tokenInfo.token_expiry) > now)
            ) {
              if (mention.instagram_story_id) {
                try {
                  const decryptedToken = await safeDecryptToken(tokenInfo.access_token);

                  const verifyResult = (await verifyStoryExists(
                    mention.instagram_story_id,
                    decryptedToken
                  )) as StoryVerificationResult;
                  verificationResult = verifyResult;
                } catch {}
              }
            } else if (tokenInfo && !tokenInfo.access_token) {
              verificationResult = 'token_invalid';
            }

            const shouldSkipUpdate =
              verificationResult === 'rate_limited' || verificationResult === 'network_error';

            if (shouldSkipUpdate) {
              continue;
            }

            const newChecksCount = mention.checks_count + 1;
            const updateData: MentionUpdateData = {
              checks_count: newChecksCount,
              last_check_at: now.toISOString(),
            };

            const mentionAge = now.getTime() - new Date(mention.mentioned_at).getTime();
            const is24Hours = mentionAge >= 24 * 60 * 60 * 1000;

            let detectedVisibility: AccountVisibility = 'unknown';
            let shouldRequestPermission = false;

            if (verificationResult === 'exists') {
              detectedVisibility = 'public';
              updateData.account_visibility = 'public';
            } else if (verificationResult === 'deleted') {
              detectedVisibility = 'public';
              updateData.account_visibility = 'public';
            } else if (verificationResult === 'private_or_no_permission') {
              detectedVisibility = 'private';
              updateData.account_visibility = 'private';
            }

            if (verificationResult === 'deleted' && !is24Hours) {
              updateData.state = 'flagged_early_delete';
              updateData.processed = true;
              updateData.processed_at = now.toISOString();
            } else if (
              (verificationResult === 'private_or_no_permission' ||
                verificationResult === 'token_invalid') &&
              !is24Hours
            ) {
              updateData.state = 'expired_unknown';
              updateData.processed = true;
              updateData.processed_at = now.toISOString();
            }

            if (
              detectedVisibility === 'public' &&
              verificationResult === 'exists' &&
              mention.matched_ambassador_id &&
              !mention.permission_requested_at
            ) {
              const { data: ambassadorToken } = await supabase
                .from('ambassador_tokens')
                .select('id')
                .eq('embassador_id', mention.matched_ambassador_id)
                .single();

              if (!ambassadorToken) {
                shouldRequestPermission = true;
                updateData.permission_requested_at = now.toISOString();
              }
            }

            const { error: updateError } = await supabase
              .from('social_mentions')
              .update(updateData)
              .eq('id', mention.id);

            if (!updateError) {
              verificationCount++;

              if (updateData.state === 'flagged_early_delete') {
                await supabase.from('notifications').insert({
                  organization_id: mention.organization_id,
                  type: 'story_early_delete',
                  message: `Historia de @${mention.instagram_username || 'usuario desconocido'} fue eliminada antes de 24h`,
                  target_type: 'story_mention',
                  target_id: mention.id,
                  priority: 'medium',
                });
                notificationCount++;
              } else if (updateData.state === 'expired_unknown') {
                await supabase.from('notifications').insert({
                  organization_id: mention.organization_id,
                  type: 'story_verification_failed',
                  message: `No se pudo verificar la historia de @${mention.instagram_username || 'usuario desconocido'} (cuenta privada o sin permisos)`,
                  target_type: 'story_mention',
                  target_id: mention.id,
                  priority: 'low',
                });
                notificationCount++;
              }

              if (shouldRequestPermission) {
                await supabase.from('notifications').insert({
                  organization_id: mention.organization_id,
                  type: 'ambassador_permission_request',
                  message: `@${mention.instagram_username || 'usuario'} tiene cuenta pública pero no ha conectado Instagram. Envíale el link de conexión para obtener más métricas.`,
                  target_type: 'ambassador',
                  target_id: mention.matched_ambassador_id,
                  priority: 'normal',
                });
                notificationCount++;
                permissionRequestCount++;
              }
            }
          } catch {}
        }
      }
    }

    const { data: expiredMentions, error: expiredError } = await supabase
      .from('social_mentions')
      .select('id, organization_id, instagram_username, mentioned_at, expires_at')
      .eq('mention_type', 'story_referral')
      .eq('state', 'new')
      .lt('expires_at', new Date().toISOString());

    if (!expiredError) {
      for (const mention of expiredMentions || []) {
        try {
          let finalSnapshotCreated = false;

          const { data: tokenInfo } = await supabase
            .from('organization_instagram_tokens')
            .select('access_token, token_expiry')
            .eq('organization_id', mention.organization_id)
            .single();

          if (tokenInfo?.access_token && mention.instagram_story_id) {
            try {
              const decryptedToken = await safeDecryptToken(tokenInfo.access_token);

              const insightsUrl = `${INSTAGRAM_API_BASE}/${mention.instagram_story_id}/insights?metric=${STORY_INSIGHTS_METRICS}&access_token=${decryptedToken}`;
              const insightsResponse = await fetch(insightsUrl);

              if (insightsResponse.ok) {
                const insightsData = await insightsResponse.json();

                const insights: InsightsMap = {};
                for (const metric of insightsData.data || []) {
                  insights[metric.name] = metric.values?.[0]?.value || 0;
                }

                const finalSnapshot = {
                  social_mention_id: mention.id,
                  organization_id: mention.organization_id,
                  instagram_story_id: mention.instagram_story_id,
                  instagram_media_id: mention.instagram_story_id,
                  snapshot_at: new Date().toISOString(),
                  story_age_hours: 24,
                  impressions: insights.impressions || 0,
                  reach: insights.reach || 0,
                  replies: insights.replies || 0,
                  exits: insights.exits || 0,
                  taps_forward: insights.taps_forward || 0,
                  taps_back: insights.taps_back || 0,
                  shares: insights.shares || 0,
                  navigation: {},
                  raw_insights: insightsData,
                };

                const { error: snapshotError } = await supabase
                  .from('story_insights_snapshots')
                  .insert(finalSnapshot);

                if (!snapshotError) {
                  finalSnapshotCreated = true;
                }
              }
            } catch {}
          }

          const { error: updateError } = await supabase
            .from('social_mentions')
            .update({
              state: 'completed',
              processed: true,
              processed_at: new Date().toISOString(),
            })
            .eq('id', mention.id);

          if (updateError) {
            continue;
          }

          processedCount++;

          const notificationMessage = finalSnapshotCreated
            ? `Historia de @${mention.instagram_username || 'usuario desconocido'} completó su ciclo de 24h (insights finales guardados)`
            : `Historia de @${mention.instagram_username || 'usuario desconocido'} completó su ciclo de 24h naturalmente`;

          const { error: notificationError } = await supabase.from('notifications').insert({
            organization_id: mention.organization_id,
            type: 'story_mention_completed',
            message: notificationMessage,
            target_type: 'story_mention',
            target_id: mention.id,
            priority: 'low',
          });

          if (!notificationError) {
            notificationCount++;
          }
        } catch {}
      }
    }

    return jsonResponse({
      success: true,
      verified: verificationCount,
      processed: processedCount,
      notifications_sent: notificationCount,
      permission_requests: permissionRequestCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleError(error);
  }
});
