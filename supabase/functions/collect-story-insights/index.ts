/**
 * Collect Story Insights Function
 * 
 * This function polls Instagram Stories that are still active (<24h old) 
 * and collects their insights metrics, storing snapshots in Supabase.
 * 
 * Designed to be called by a cron job every 2 hours to capture the evolution
 * of Story metrics throughout their 24-hour lifecycle.
 * 
 * Snapshots are taken at: 1h, 4h, 8h, 12h, 20h, 23h after story creation
 */

import { corsHeaders, STORY_EXPIRATION_MS, META_API_BASE, STORY_INSIGHTS_METRICS } from '../shared/constants.ts';
import { Organization, SupabaseClient, InsightsMap } from '../shared/types.ts';
import { corsPreflightResponse, jsonResponse, errorResponse } from '../shared/responses.ts';
import { authenticateRequest, getUserOrganization } from '../shared/auth.ts';
import { handleError } from '../shared/error-handler.ts';
import { safeDecryptToken } from '../shared/crypto.ts';
import { fetchStoryInsights } from '../shared/instagram-api.ts';

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
      storiesProcessed?: number;
      snapshotsCreated?: number;
      errors?: string[];
      error?: string;
    }

    const results: OrgResult[] = [];
    let totalStoriesProcessed = 0;
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
          
          continue;
        }

        const decryptedToken = await safeDecryptToken(tokenData.access_token);
        
        // Collect insights for this organization
        const orgResult = await collectOrganizationStoryInsights(
          supabase,
          org,
          decryptedToken
        );

        totalStoriesProcessed += orgResult.storiesProcessed;
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
      `${totalStoriesProcessed} stories processed, ` +
      `${totalSnapshotsCreated} snapshots created`
    );

    return jsonResponse({
      success: true,
      results,
      totalStoriesProcessed,
      totalSnapshotsCreated,
      isCronJob,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleError(error);
  }
});

// Local interfaces specific to this function

/**
 * Collect Story insights for a specific organization
 */
async function collectOrganizationStoryInsights(
  supabase: ReturnType<typeof createClient>,
  organization: Organization,
  accessToken: string
): Promise<{ storiesProcessed: number; snapshotsCreated: number; errors: string[] }> {
  
  let storiesProcessed = 0;
  let snapshotsCreated = 0;
  const errors: string[] = [];

  try {
    // Get active Stories from social_mentions (stories created in last 24h)
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const { data: activeStoryMentions, error: mentionsError } = await supabase
      .from('social_mentions')
      .select('id, instagram_story_id, instagram_media_id, instagram_user_id, mentioned_at, expires_at, state')
      .eq('organization_id', organization.id)
      .eq('mention_type', 'story_referral')
      .in('state', ['new', 'flagged_early_delete']) // Only active or recently deleted
      .gte('mentioned_at', twentyFourHoursAgo.toISOString())
      .lt('mentioned_at', now.toISOString());

    if (mentionsError) {
      console.error('Error fetching active story mentions:', mentionsError);
      errors.push(`Failed to fetch story mentions: ${mentionsError.message}`);
      return { storiesProcessed, snapshotsCreated, errors };
    }

    console.log(`Found ${activeStoryMentions?.length || 0} active story mentions for ${organization.name}`);

    // Also get Stories from Instagram API directly (for comprehensive coverage)
    const apiStories = await fetchStoriesFromInstagram(
      organization.instagram_business_account_id,
      accessToken
    );

    console.log(`Found ${apiStories.length} stories from Instagram API`);

    // Merge stories from both sources (deduplicate by story ID)
    const storiesToProcess = mergeStories(activeStoryMentions || [], apiStories);

    for (const story of storiesToProcess) {
      try {
        const storyId = story.instagram_story_id || story.id;
        
        if (!storyId) {
          console.log('Skipping story without ID');
          continue;
        }

        // Check if we should collect a snapshot based on story age
        const timestamp = story.mentioned_at || story.timestamp;
        if (!timestamp) {
          console.log('Skipping story without timestamp');
          continue;
        }
        const storyAge = calculateStoryAgeHours(timestamp);
        
        const snapshotId = story.id || story.instagram_story_id || '';
        if (!shouldCollectSnapshot(snapshotId, storyAge)) {
          console.log(`Skipping snapshot for story ${storyId}, age: ${storyAge}h`);
          continue;
        }

        // Fetch insights from Instagram API
        const insights = await fetchStoryInsights(storyId, accessToken);

        if (!insights) {
          console.log(`No insights available for story ${storyId}`);
          continue;
        }

        // Store snapshot
        const snapshot = {
          social_mention_id: story.id || null,
          organization_id: organization.id,
          instagram_story_id: storyId,
          instagram_media_id: story.instagram_media_id || null,
          snapshot_at: now.toISOString(),
          story_age_hours: storyAge,
          impressions: insights.impressions || 0,
          reach: insights.reach || 0,
          replies: insights.replies || 0,
          exits: insights.exits || 0,
          taps_forward: insights.taps_forward || 0,
          taps_back: insights.taps_back || 0,
          shares: insights.shares || 0,
          navigation: insights.navigation || {},
          raw_insights: insights.raw || {}
        };

        const { error: insertError } = await supabase
          .from('story_insights_snapshots')
          .insert(snapshot);

        if (insertError) {
          console.error(`Error inserting snapshot for story ${storyId}:`, insertError);
          errors.push(`Failed to insert snapshot: ${insertError.message}`);
        } else {
          snapshotsCreated++;
          console.log(`Created snapshot for story ${storyId} (age: ${storyAge}h)`);
        }

        storiesProcessed++;

      } catch (error) {
        console.error(`Error processing story:`, error);
        errors.push(`Story processing error: ${error.message}`);
      }
    }

  } catch (error) {
    console.error(`Error in collectOrganizationStoryInsights:`, error);
    errors.push(`Organization processing error: ${error.message}`);
  }

  return { storiesProcessed, snapshotsCreated, errors };
}

/**
 * Types for story data
 */
interface DBStory {
  id: string | null;
  instagram_story_id: string | null;
  instagram_media_id: string | null;
  instagram_user_id?: string | null;
  mentioned_at: string;
  expires_at?: string | null;
  state: string;
}

interface APIStory {
  id: string;
  media_type?: string;
  media_product_type: string;
  timestamp: string;
}

interface MergedStory {
  id: string | null;
  instagram_story_id: string | null;
  instagram_media_id: string | null;
  mentioned_at?: string;
  timestamp?: string;
  state?: string;
}

/**
 * Fetch Stories from Instagram API
 */
async function fetchStoriesFromInstagram(
  instagramBusinessAccountId: string,
  accessToken: string
): Promise<APIStory[]> {
  try {
    // Get recent media, filtering for Stories
    const mediaUrl = `${META_API_BASE}/${instagramBusinessAccountId}/media?fields=id,media_type,media_product_type,timestamp&limit=50&access_token=${accessToken}`;
    
    const response = await fetch(mediaUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error('Error fetching media from Instagram:', data.error);
      return [];
    }

    // Filter for Stories only (media_product_type === 'STORY')
    const stories = (data.data || []).filter((media: APIStory) => 
      media.media_product_type === 'STORY' && 
      isStoryActive(media.timestamp)
    );

    return stories;

  } catch (error) {
    console.error('Error fetching stories from Instagram:', error);
    return [];
  }
}

// fetchStoryInsights is now imported from shared/instagram-api.ts

/**
 * Calculate story age in hours
 */
function calculateStoryAgeHours(timestamp: string): number {
  const now = new Date().getTime();
  const storyTime = new Date(timestamp).getTime();
  const ageMs = now - storyTime;
  return Math.round((ageMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimals
}

/**
 * Check if a story is still active (<24h old)
 */
function isStoryActive(timestamp: string): boolean {
  const ageHours = calculateStoryAgeHours(timestamp);
  return ageHours < 24;
}

/**
 * Determine if we should collect a snapshot based on story age
 * We want snapshots at: 1h, 4h, 8h, 12h, 20h, 23h
 * With a 30-minute window on each side
 */
function shouldCollectSnapshot(storyId: string, ageHours: number): boolean {
  const snapshotPoints = [1, 4, 8, 12, 20, 23];
  const windowHours = 0.5; // 30-minute window

  for (const point of snapshotPoints) {
    if (Math.abs(ageHours - point) <= windowHours) {
      return true;
    }
  }

  return false;
}

/**
 * Merge stories from database and API, removing duplicates
 */
function mergeStories(dbStories: DBStory[], apiStories: APIStory[]): MergedStory[] {
  const merged: MergedStory[] = [...dbStories];
  const existingIds = new Set(
    dbStories.map(s => s.instagram_story_id).filter(Boolean)
  );

  for (const apiStory of apiStories) {
    if (!existingIds.has(apiStory.id)) {
      merged.push({
        id: null, // No social_mention_id
        instagram_story_id: apiStory.id,
        instagram_media_id: apiStory.id,
        mentioned_at: apiStory.timestamp,
        state: 'api_only'
      });
    }
  }

  return merged;
}

