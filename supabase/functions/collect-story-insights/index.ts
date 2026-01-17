import type { Organization, SupabaseClient } from '../shared/types.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { authenticateRequest, getUserOrganization } from '../shared/auth.ts';
import { handleError } from '../shared/error-handler.ts';
import { safeDecryptToken } from '../shared/crypto.ts';
import { fetchAccountStories, fetchStoryInsights } from '../shared/instagram-api.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const authResult = await authenticateRequest(req, { requireAuth: false, allowCron: true });
    if (authResult instanceof Response) return authResult;

    const { user, supabase, isCron } = authResult;

    let targetOrgId: string | null = null;

    if (isCron) {
      try {
        const body = await req.json();
        targetOrgId = body?.organization_id ?? null;
      } catch {}
    } else {
      targetOrgId = await getUserOrganization(supabase, user.id);
    }

    let organizationsQuery = supabase
      .from('organizations')
      .select('id, name, instagram_business_account_id')
      .not('instagram_business_account_id', 'is', null);

    if (targetOrgId) {
      organizationsQuery = organizationsQuery.eq('id', targetOrgId);
    }

    const { data: organizations, error: orgsError } = await organizationsQuery;

    if (orgsError) {
      throw new Error('Failed to fetch organizations');
    }

    interface OrgResult {
      organization_id: string;
      organization_name: string;
      success: boolean;
      storiesFound?: number;
      snapshotsCreated?: number;
      errors?: string[];
      error?: string;
    }

    const results: OrgResult[] = [];
    let totalStoriesFound = 0;
    let totalSnapshotsCreated = 0;

    for (const org of organizations || []) {
      try {
        const { data: tokenData, error: tokenError } = await supabase
          .from('organization_instagram_tokens')
          .select('access_token, token_expiry')
          .eq('organization_id', org.id)
          .single();

        if (tokenError || !tokenData) {
          results.push({
            organization_id: org.id,
            organization_name: org.name,
            success: false,
            error: 'No Instagram token found',
          });
          continue;
        }

        if (tokenData.token_expiry && new Date(tokenData.token_expiry) < new Date()) {
          await supabase.from('notifications').insert({
            organization_id: org.id,
            type: 'token_expired',
            message:
              'Tu token de Instagram ha expirado. Reconecta tu cuenta para continuar recolectando insights de Stories.',
            priority: 'high',
          });

          results.push({
            organization_id: org.id,
            organization_name: org.name,
            success: false,
            error: 'Token expired',
          });
          continue;
        }

        const decryptedToken = await safeDecryptToken(tokenData.access_token);

        const orgResult = await collectOrganizationStoryInsights(supabase, org, decryptedToken);

        totalStoriesFound += orgResult.storiesFound;
        totalSnapshotsCreated += orgResult.snapshotsCreated;

        results.push({
          organization_id: org.id,
          organization_name: org.name,
          success: true,
          ...orgResult,
        });
      } catch (error) {
        results.push({
          organization_id: org.id,
          organization_name: org.name,
          success: false,
          error: error.message,
        });
      }
    }

    return jsonResponse({
      success: true,
      results,
      totalStoriesFound,
      totalSnapshotsCreated,
      isCron,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleError(error);
  }
});

async function collectOrganizationStoryInsights(
  supabase: SupabaseClient,
  organization: Organization,
  accessToken: string
): Promise<{ storiesFound: number; snapshotsCreated: number; errors: string[] }> {
  let storiesFound = 0;
  let snapshotsCreated = 0;
  const errors: string[] = [];
  const now = new Date();

  try {
    const stories = await fetchAccountStories(
      organization.instagram_business_account_id!,
      accessToken,
      { fields: 'id,timestamp,media_type' }
    );

    storiesFound = stories.length;

    if (storiesFound === 0) {
      return { storiesFound, snapshotsCreated, errors };
    }

    for (const story of stories) {
      try {
        const storyId = story.id;

        if (!storyId) {
          continue;
        }

        const storyAge = story.timestamp ? calculateStoryAgeHours(story.timestamp) : null;

        const insights = await fetchStoryInsights(storyId, accessToken);

        if (!insights) {
          continue;
        }

        const { data: existingMention } = await supabase
          .from('social_mentions')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('instagram_story_id', storyId)
          .single();

        const navBreakdown = typeof insights.navigation === 'object' ? insights.navigation : null;

        const snapshot = {
          social_mention_id: existingMention?.id || null,
          organization_id: organization.id,
          instagram_story_id: storyId,
          instagram_media_id: storyId,
          snapshot_at: now.toISOString(),
          story_age_hours: storyAge,
          reach: insights.reach || 0,
          replies: insights.replies || 0,
          shares: insights.shares || 0,
          profile_visits: insights.profile_visits || 0,
          total_interactions: insights.total_interactions || 0,
          views: insights.views || 0,
          exits: navBreakdown?.tap_exit ?? insights.exits ?? 0,
          taps_forward: navBreakdown
            ? (navBreakdown.tap_forward ?? 0) + (navBreakdown.swipe_forward ?? 0)
            : (insights.taps_forward ?? 0),
          taps_back: navBreakdown?.tap_back ?? insights.taps_back ?? 0,
          navigation: insights.navigation ?? {},
          impressions: insights.impressions ?? 0,
          raw_insights: insights,
        };

        const { error: insertError } = await supabase
          .from('story_insights_snapshots')
          .insert(snapshot);

        if (insertError) {
          errors.push(`Failed to insert snapshot for ${storyId}: ${insertError.message}`);
        } else {
          snapshotsCreated++;
        }
      } catch (error) {
        errors.push(`Story ${story.id} error: ${error.message}`);
      }
    }
  } catch (error) {
    errors.push(`Organization processing error: ${error.message}`);
  }

  return { storiesFound, snapshotsCreated, errors };
}

function calculateStoryAgeHours(timestamp: string): number {
  const now = new Date().getTime();
  const storyTime = new Date(timestamp).getTime();
  const ageMs = now - storyTime;
  return Math.round((ageMs / (1000 * 60 * 60)) * 100) / 100;
}
