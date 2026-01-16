import { corsHeaders, INSTAGRAM_API_BASE } from '../shared/constants.ts';
import type {
  SupabaseClient,
  SyncResult,
  InsightsMap,
  MediaItem,
  Ambassador,
  Fiesta,
} from '../shared/types.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';
import { handleError } from '../shared/error-handler.ts';
import { encryptToken, safeDecryptToken } from '../shared/crypto.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const supabaseClient = createSupabaseClient();

    const authHeader = req.headers.get('Authorization');
    const cronSecretHeader = req.headers.get('x-cron-secret');
    const expectedCronSecret = Deno.env.get('CRON_SECRET');

    const isCronJob = !authHeader;
    let targetOrgId: string | null = null;
    let userId: string | null = null;

    if (isCronJob) {
      if (!cronSecretHeader || !expectedCronSecret || cronSecretHeader !== expectedCronSecret) {
        console.error('Unauthorized cron request: Invalid or missing CRON_SECRET');
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid cron secret' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('Starting Instagram sync process... (CRON JOB)');

      try {
        const body = await req.json();
        targetOrgId = body?.organization_id ?? null;
      } catch (_) {
      }
    } else {
      console.log('Starting Instagram sync process... (USER REQUEST)');

      try {
        const body = await req.json();
        targetOrgId = body?.organization_id ?? null;
      } catch (_) {
      }
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

      if (authError || !user) {
        throw new Error('Unauthorized');
      }

      userId = user.id;

      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      if (targetOrgId && targetOrgId !== userData.organization_id) {
        throw new Error('Cannot sync organization that does not belong to you');
      }

      if (!targetOrgId) {
        targetOrgId = userData.organization_id;
      }
    }

    let organizationsQuery = supabaseClient
      .from('organizations')
      .select('id, name, instagram_user_id, instagram_username')
      .not('instagram_user_id', 'is', null)
      .order('last_instagram_sync', { ascending: true, nullsFirst: true });

    if (targetOrgId) {
      organizationsQuery = organizationsQuery.eq('id', targetOrgId);
    }

    const { data: organizations, error: orgsError } = await organizationsQuery;

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
      throw new Error('Failed to fetch organizations');
    }

    console.log(
      `Found ${organizations?.length || 0} organization(s) ${targetOrgId ? `(targeted: ${targetOrgId})` : ''}`
    );

    if (targetOrgId && (!organizations || organizations.length === 0)) {
      console.log(`Target organization ${targetOrgId} not found or has no Instagram connected`);
    }

    const results: SyncResult[] = [];
    let totalProcessed = 0;

    for (const org of organizations || []) {
      try {
        console.log(`Syncing data for organization: ${org.name} (${org.id})`);

        const { data: tokenData, error: tokenError } = await supabaseClient
          .from('organization_instagram_tokens')
          .select('access_token, token_expiry')
          .eq('organization_id', org.id)
          .single();

        if (tokenError || !tokenData) {
          console.log(`No Instagram token found for organization ${org.name}`);
          continue;
        }

        if (tokenData.token_expiry && new Date(tokenData.token_expiry) < new Date()) {
          console.log(`Token expired for organization ${org.name}, creating notification`);

          await supabaseClient.from('notifications').insert({
            organization_id: org.id,
            type: 'token_expired',
            message:
              'Tu token de Instagram ha expirado. Reconecta tu cuenta para continuar sincronizando datos.',
            priority: 'high',
          });

          continue;
        }

        if (!org.instagram_user_id) {
          console.log(`No Instagram User ID for organization ${org.name}`);
          continue;
        }

        const decryptedToken = await safeDecryptToken(tokenData.access_token);
        const syncResult = await syncOrganizationInstagramData(
          supabaseClient,
          org.id,
          org.instagram_user_id,
          decryptedToken
        );

        await supabaseClient
          .from('organizations')
          .update({ last_instagram_sync: new Date().toISOString() })
          .eq('id', org.id);

        console.log(`Sync completed for ${org.name}:`, syncResult);
        results.push({
          organization_id: org.id,
          organization_name: org.name,
          success: true,
          ...syncResult,
        });

        totalProcessed++;
      } catch (error) {
        console.error(`Error syncing organization ${org.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          organization_id: org.id,
          organization_name: org.name,
          success: false,
          error: errorMessage,
        });
      }
    }

    console.log(`Instagram sync completed: ${totalProcessed} organizations processed`);

    if (isCronJob && totalProcessed > 0) {
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      console.log(`Cron sync summary: ${successCount} successful, ${failureCount} failed`);
    }

    return jsonResponse({
      success: true,
      results,
      totalProcessed,
      isCronJob,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleError(error);
  }
});

async function syncOrganizationInstagramData(
  supabaseClient: SupabaseClient,
  organizationId: string,
  igUserId: string,
  accessToken: string
) {
  console.log(`Syncing Instagram data for organization ${organizationId}, User ID: ${igUserId}`);

  try {
    const instagramMetrics = {
      totalFollowers: 0,
      totalPosts: 0,
      totalReach: 0,
      totalImpressions: 0,
      newMentions: 0,
      newTags: 0,
    };

    const metricsUrl = `${INSTAGRAM_API_BASE}/${igUserId}?fields=followers_count,media_count&access_token=${accessToken}`;
    const metricsResponse = await fetch(metricsUrl);
    const metricsData = await metricsResponse.json();

    if (metricsResponse.ok) {
      instagramMetrics.totalFollowers += metricsData.followers_count || 0;
      instagramMetrics.totalPosts += metricsData.media_count || 0;
    } else {
      console.warn(`Failed to fetch metrics for user ${igUserId}:`, metricsData);
    }

    const mediaUrl = `${INSTAGRAM_API_BASE}/${igUserId}/media?fields=id,media_type,media_product_type,timestamp,username&limit=50&access_token=${accessToken}`;
    const mediaResponse = await fetch(mediaUrl);
    const mediaData = await mediaResponse.json();

    if (mediaResponse.ok && mediaData.data) {
      for (const media of mediaData.data) {
        try {
          const isStory = media.media_product_type === 'STORY';
          const mediaTime = new Date(media.timestamp).getTime();
          const now = new Date().getTime();
          const ageHours = (now - mediaTime) / (1000 * 60 * 60);
          const isActive = ageHours < 24;

          const metrics = isStory
            ? 'impressions,reach,replies,exits,taps_forward,taps_back,shares'
            : 'reach,impressions';

          const insightsUrl = `${INSTAGRAM_API_BASE}/${media.id}/insights?metric=${metrics}&access_token=${accessToken}`;
          const insightsResponse = await fetch(insightsUrl);
          const insightsData = await insightsResponse.json();

          if (insightsResponse.ok && insightsData.data) {
            for (const insight of insightsData.data) {
              if (insight.name === 'reach') {
                instagramMetrics.totalReach += insight.values[0]?.value || 0;
              } else if (insight.name === 'impressions') {
                instagramMetrics.totalImpressions += insight.values[0]?.value || 0;
              }
            }

            if (isStory && isActive) {
              const { data: storyMention } = await supabaseClient
                .from('social_mentions')
                .select('id')
                .eq('organization_id', organizationId)
                .or(`instagram_story_id.eq.${media.id},instagram_media_id.eq.${media.id}`)
                .maybeSingle();

              if (storyMention) {
                const insights: InsightsMap = {};
                for (const insight of insightsData.data) {
                  insights[insight.name] = insight.values?.[0]?.value || 0;
                }

                const snapshot = {
                  social_mention_id: storyMention.id,
                  organization_id: organizationId,
                  instagram_story_id: media.id,
                  instagram_media_id: media.id,
                  snapshot_at: new Date().toISOString(),
                  story_age_hours: Math.round(ageHours * 100) / 100,
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

                await supabaseClient.from('story_insights_snapshots').insert(snapshot);

                console.log(`Created story insights snapshot during sync for story ${media.id}`);
              }
            }
          }
        } catch (error) {
          console.warn(`Error getting insights for media ${media.id}:`, error);
        }
      }
    } else {
      console.warn(`Failed to fetch media for user ${igUserId}:`, mediaData);
    }

    const mentionResults = await processInstagramMentionsAndTags(
      supabaseClient,
      organizationId,
      igUserId,
      accessToken
    );
    instagramMetrics.newMentions += mentionResults.newMentions;
    instagramMetrics.newTags += mentionResults.newTags;

    if (instagramMetrics.newMentions > 0 || instagramMetrics.newTags > 0) {
      await supabaseClient.from('notifications').insert({
        organization_id: organizationId,
        type: 'sync_completed',
        message: `Sincronización completada: ${instagramMetrics.newMentions} nuevas menciones, ${instagramMetrics.newTags} nuevas etiquetas detectadas.`,
        priority: 'normal',
      });
    }

    console.log(`Instagram metrics for organization ${organizationId}:`, instagramMetrics);
    return instagramMetrics;
  } catch (error) {
    console.error(`Error syncing Instagram data for organization ${organizationId}:`, error);
    throw error;
  }
}

async function processInstagramMentionsAndTags(
  supabaseClient: SupabaseClient,
  organizationId: string,
  igUserId: string,
  accessToken: string
) {
  const { data: ambassadors, error: ambassadorsError } = await supabaseClient
    .from('embassadors')
    .select('id, instagram_user, first_name, last_name')
    .eq('organization_id', organizationId)
    .not('instagram_user', 'is', null);

  if (ambassadorsError) {
    console.warn('Error loading ambassadors for org', organizationId, ambassadorsError);
    return { newMentions: 0, newTags: 0 };
  }

  const ambassadorMap = new Map();
  for (const ambassador of ambassadors || []) {
    if (ambassador.instagram_user) {
      const normalizedUsername = ambassador.instagram_user.toLowerCase().replace('@', '');
      ambassadorMap.set(normalizedUsername, ambassador);
    }
  }

  const { data: fiestas, error: fiestasError } = await supabaseClient
    .from('fiestas')
    .select('id')
    .eq('organization_id', organizationId);

  if (fiestasError) {
    console.warn('Error loading fiestas for org', organizationId, fiestasError);
  }

  const fiestaIds = (fiestas || []).map((f: Fiesta) => f.id);
  let activeEventId: string | null = null;

  if (fiestaIds.length > 0) {
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('id')
      .in('fiesta_id', fiestaIds)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!eventError && event) {
      activeEventId = event.id;
    }
  }

  let newMentions = 0;
  let newTags = 0;

  try {
    const mentionsUrl = `${INSTAGRAM_API_BASE}/${igUserId}/mentioned_media?fields=id,media_type,media_url,permalink,caption,timestamp,username&limit=50&access_token=${accessToken}`;
    const mentionsRes = await fetch(mentionsUrl);
    const mentionsData = await mentionsRes.json();

    if (mentionsRes.ok && Array.isArray(mentionsData.data)) {
      console.log(
        `Found ${mentionsData.data.length} mentioned media for organization ${organizationId}`
      );

      for (const m of mentionsData.data) {
        const isNew = await processMentionOrTag(
          supabaseClient,
          organizationId,
          m,
          ambassadorMap,
          activeEventId,
          'mention'
        );
        if (isNew) newMentions++;
      }
    } else {
      console.warn('Failed to load mentioned_media:', mentionsData?.error || mentionsData);
    }
  } catch (err) {
    console.warn('Error fetching mentioned_media:', err);
  }

  try {
    const tagsUrl = `${INSTAGRAM_API_BASE}/${igUserId}/tags?fields=id,media_type,media_url,permalink,caption,timestamp,username&limit=50&access_token=${accessToken}`;
    const tagsRes = await fetch(tagsUrl);
    const tagsData = await tagsRes.json();

    if (tagsRes.ok && Array.isArray(tagsData.data)) {
      console.log(`Found ${tagsData.data.length} tagged media for organization ${organizationId}`);

      for (const t of tagsData.data) {
        const isNew = await processMentionOrTag(
          supabaseClient,
          organizationId,
          t,
          ambassadorMap,
          activeEventId,
          'tag'
        );
        if (isNew) newTags++;
      }
    } else {
      console.warn('Failed to load tags:', tagsData?.error || tagsData);
    }
  } catch (err) {
    console.warn('Error fetching tags:', err);
  }

  return { newMentions, newTags };
}

async function processMentionOrTag(
  supabaseClient: SupabaseClient,
  organizationId: string,
  mediaItem: MediaItem,
  ambassadorMap: Map<string, Ambassador>,
  activeEventId: string | null,
  type: 'mention' | 'tag'
): Promise<boolean> {
  try {
    const { data: existingSocial, error: existSocialError } = await supabaseClient
      .from('social_mentions')
      .select('id')
      .eq('instagram_media_id', mediaItem.id)
      .maybeSingle();

    if (existingSocial && !existSocialError) {
      return false;
    }

    const { data: existingTask, error: existTaskError } = await supabaseClient
      .from('tasks')
      .select('id')
      .eq('instagram_story_id', mediaItem.id)
      .maybeSingle();

    if (existingTask && !existTaskError) {
      return false;
    }

    const normalizedUsername = mediaItem.username
      ? mediaItem.username.toLowerCase().replace('@', '')
      : null;
    const ambassador = normalizedUsername ? ambassadorMap.get(normalizedUsername) : null;

    const { data: socialMention, error: socialMentionError } = await supabaseClient
      .from('social_mentions')
      .insert({
        organization_id: organizationId,
        instagram_media_id: mediaItem.id,
        instagram_username: mediaItem.username,
        instagram_user_id: null,
        mention_type: type,
        story_url: mediaItem.permalink || mediaItem.media_url,
        content: mediaItem.caption || null,
        matched_ambassador_id: ambassador ? ambassador.id : null,
        processed: ambassador ? true : false,
      })
      .select('id')
      .single();

    if (socialMentionError) {
      console.error('Error creating social mention:', socialMentionError);
      return false;
    }

    if (ambassador && activeEventId) {
      await supabaseClient.from('tasks').insert({
        embassador_id: ambassador.id,
        event_id: activeEventId,
        task_type: type,
        status: 'uploaded',
        instagram_story_id: mediaItem.id,
        story_url: mediaItem.permalink || mediaItem.media_url,
        platform: 'instagram',
        verified_through_api: true,
        upload_time: mediaItem.timestamp,
        last_status_update: new Date().toISOString(),
      });

      console.log(`Created ${type} task for ambassador ${ambassador.id} (${mediaItem.username})`);
    }

    return true;
  } catch (err) {
    console.warn(`Error processing ${type} media:`, err);
    return false;
  }
}
