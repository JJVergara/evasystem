/**
 * Collect Story Insights Function
 * 
 * This function fetches insights for active Instagram Stories (<24h old)
 * using the Instagram Graph API and stores snapshots in Supabase.
 * 
 * Flow:
 * 1. GET /{instagram_business_account_id}/stories - Get all active story IDs
 * 2. GET /{story_id}/insights?metric=... - Get insights for each story
 * 3. Store snapshots in story_insights_snapshots table
 * 
 * Designed to be called by a cron job every 2 hours.
 */

import { corsHeaders, STORY_INSIGHTS_METRICS } from '../shared/constants.ts';
import { Organization, SupabaseClient, StoryInsights } from '../shared/types.ts';
import { corsPreflightResponse, jsonResponse, errorResponse } from '../shared/responses.ts';
import { authenticateRequest, getUserOrganization } from '../shared/auth.ts';
import { handleError } from '../shared/error-handler.ts';
import { safeDecryptToken } from '../shared/crypto.ts';
import { fetchAccountStories, fetchStoryInsights, StoryItem } from '../shared/instagram-api.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // Authenticate request (allows both cron and user requests)
    const authResult = await authenticateRequest(req, { requireAuth: false, allowCron: true });
    if (authResult instanceof Response) return authResult;
    
    const { user, supabase, isCron } = authResult;
    
    let targetOrgId: string | null = null;

    if (isCron) {
      console.log('Starting Story insights collection... (CRON JOB)');
      // Parse optional target organization
      try {
        const body = await req.json();
        targetOrgId = body?.organization_id ?? null;
      } catch (_) {
        // No body provided
      }
    } else {
      console.log('Starting Story insights collection... (USER REQUEST)');
      // Get user's organization
      targetOrgId = await getUserOrganization(supabase, user.id);
    }

    // Get organizations with Instagram connections
    let organizationsQuery = supabase
      .from('organizations')
      .select('id, name, instagram_business_account_id')
      .not('instagram_business_account_id', 'is', null);

    if (targetOrgId) {
      organizationsQuery = organizationsQuery.eq('id', targetOrgId);
    }

    const { data: organizations, error: orgsError } = await organizationsQuery;

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
      throw new Error('Failed to fetch organizations');
    }

    console.log(`Found ${organizations?.length || 0} organization(s) to process`);

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
        console.log(`Processing organization: ${org.name} (${org.id})`);

        // Get Instagram token
        const { data: tokenData, error: tokenError } = await supabase
          .from('organization_instagram_tokens')
          .select('access_token, token_expiry')
          .eq('organization_id', org.id)
          .single();

        if (tokenError || !tokenData) {
          console.log(`No Instagram token found for organization ${org.name}`);
          results.push({
            organization_id: org.id,
            organization_name: org.name,
            success: false,
            error: 'No Instagram token found'
          });
          continue;
        }

        // Check token expiry
        if (tokenData.token_expiry && new Date(tokenData.token_expiry) < new Date()) {
          console.log(`Token expired for organization ${org.name}`);
          
          await supabase
            .from('notifications')
            .insert({
              organization_id: org.id,
              type: 'token_expired',
              message: 'Tu token de Instagram ha expirado. Reconecta tu cuenta para continuar recolectando insights de Stories.',
              priority: 'high'
            });
          
          results.push({
            organization_id: org.id,
            organization_name: org.name,
            success: false,
            error: 'Token expired'
          });
          continue;
        }

        const decryptedToken = await safeDecryptToken(tokenData.access_token);
        
        // Collect insights for this organization
        const orgResult = await collectOrganizationStoryInsights(
          supabase,
          org,
          decryptedToken
        );

        totalStoriesFound += orgResult.storiesFound;
        totalSnapshotsCreated += orgResult.snapshotsCreated;

        results.push({
          organization_id: org.id,
          organization_name: org.name,
          success: true,
          ...orgResult
        });

      } catch (error) {
        console.error(`Error processing organization ${org.name}:`, error);
        results.push({
          organization_id: org.id,
          organization_name: org.name,
          success: false,
          error: error.message
        });
      }
    }

    console.log(
      `Story insights collection completed: ` +
      `${totalStoriesFound} stories found, ` +
      `${totalSnapshotsCreated} snapshots created`
    );

    return jsonResponse({
      success: true,
      results,
      totalStoriesFound,
      totalSnapshotsCreated,
      isCron,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleError(error);
  }
});

/**
 * Collect Story insights for a specific organization
 */
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
    // Step 1: Fetch active stories using the /stories endpoint
    // This returns only stories that are currently active (<24h old)
    const stories = await fetchAccountStories(
      organization.instagram_business_account_id!,
      accessToken,
      { fields: 'id,timestamp,media_type' }
    );

    storiesFound = stories.length;
    console.log(`Found ${storiesFound} active stories for ${organization.name}`);

    if (storiesFound === 0) {
      return { storiesFound, snapshotsCreated, errors };
    }

    // Step 2: For each story, fetch insights and store snapshot
    for (const story of stories) {
      try {
        const storyId = story.id;
        
        if (!storyId) {
          console.log('Skipping story without ID');
          continue;
        }

        // Calculate story age for metadata
        const storyAge = story.timestamp ? calculateStoryAgeHours(story.timestamp) : null;

        console.log(`Fetching insights for story ${storyId} (age: ${storyAge?.toFixed(1) || 'unknown'}h)`);

        // Step 2a: Fetch insights from Instagram API
        // GET /{story_id}/insights?metric=impressions,reach,replies,...
        const insights = await fetchStoryInsights(storyId, accessToken);

        if (!insights) {
          console.log(`No insights available for story ${storyId}`);
          continue;
        }

        console.log(`Story ${storyId} insights:`, JSON.stringify(insights));

        // Step 2b: Try to find matching social_mention record
        const { data: existingMention } = await supabase
          .from('social_mentions')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('instagram_story_id', storyId)
          .single();

        // Step 2c: Store snapshot in database
        // Parse navigation breakdown if available
        const navBreakdown = typeof insights.navigation === 'object' ? insights.navigation : null;
        
        const snapshot = {
          social_mention_id: existingMention?.id || null,
          organization_id: organization.id,
          instagram_story_id: storyId,
          instagram_media_id: storyId, // Story ID is also the media ID
          snapshot_at: now.toISOString(),
          story_age_hours: storyAge,
          // Core metrics
          reach: insights.reach || 0,
          replies: insights.replies || 0,
          shares: insights.shares || 0,
          // New engagement metrics
          profile_visits: insights.profile_visits || 0,
          total_interactions: insights.total_interactions || 0,
          views: insights.views || 0,
          // Navigation breakdown
          exits: navBreakdown?.tap_exit ?? insights.exits ?? 0,
          taps_forward: navBreakdown 
            ? ((navBreakdown.tap_forward ?? 0) + (navBreakdown.swipe_forward ?? 0))
            : (insights.taps_forward ?? 0),
          taps_back: navBreakdown?.tap_back ?? insights.taps_back ?? 0,
          navigation: insights.navigation || {},
          // Legacy (deprecated)
          impressions: insights.impressions || 0,
          raw_insights: insights
        };

        const { error: insertError } = await supabase
          .from('story_insights_snapshots')
          .insert(snapshot);

        if (insertError) {
          console.error(`Error inserting snapshot for story ${storyId}:`, insertError);
          errors.push(`Failed to insert snapshot for ${storyId}: ${insertError.message}`);
        } else {
          snapshotsCreated++;
          console.log(`Created snapshot for story ${storyId}`);
        }

      } catch (error) {
        console.error(`Error processing story ${story.id}:`, error);
        errors.push(`Story ${story.id} error: ${error.message}`);
      }
    }

  } catch (error) {
    console.error(`Error in collectOrganizationStoryInsights:`, error);
    errors.push(`Organization processing error: ${error.message}`);
  }

  return { storiesFound, snapshotsCreated, errors };
}

/**
 * Calculate story age in hours
 */
function calculateStoryAgeHours(timestamp: string): number {
  const now = new Date().getTime();
  const storyTime = new Date(timestamp).getTime();
  const ageMs = now - storyTime;
  return Math.round((ageMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimals
}
