import { corsHeaders, INSTAGRAM_API_BASE } from '../shared/constants.ts';
import type { MediaItem } from '../shared/types.ts';
import { SupabaseClient } from '../shared/types.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';
import { handleError } from '../shared/error-handler.ts';
import { safeDecryptToken } from '../shared/crypto.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const supabase = createSupabaseClient();

    const { organizationId, mentionId } = await req.json();

    // Validate required parameters
    if (!mentionId) {
      console.error('Missing mentionId parameter');
      return jsonResponse(
        {
          success: false,
          error: 'Missing mentionId parameter',
        },
        { status: 400 }
      );
    }

    if (!organizationId) {
      console.error('Missing organizationId parameter');
      return jsonResponse(
        {
          success: false,
          error: 'Missing organizationId parameter',
        },
        { status: 400 }
      );
    }

    console.log(`Resolving story mention ${mentionId} for organization ${organizationId}`);

    // Get the mention record
    const { data: mention, error: mentionError } = await supabase
      .from('social_mentions')
      .select('*')
      .eq('id', mentionId)
      .eq('mention_type', 'story_referral')
      .single();

    if (mentionError || !mention) {
      console.error('Mention not found:', mentionError);
      return jsonResponse(
        {
          success: false,
          error: 'Mention not found',
        },
        { status: 404 }
      );
    }

    // Get organization Instagram tokens
    const { data: tokenInfo } = await supabase
      .from('organization_instagram_tokens')
      .select('access_token, token_expiry')
      .eq('organization_id', organizationId)
      .single();

    if (!tokenInfo || !tokenInfo.access_token) {
      console.error('No Instagram token found for organization');

      // Mark as unverifiable
      await supabase
        .from('social_mentions')
        .update({
          state: 'expired_unknown',
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', mentionId);

      return jsonResponse(
        {
          success: false,
          error: 'No Instagram access token available',
        },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (tokenInfo.token_expiry && new Date(tokenInfo.token_expiry) < new Date()) {
      console.error('Instagram token expired');

      await supabase
        .from('social_mentions')
        .update({
          state: 'expired_unknown',
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', mentionId);

      return jsonResponse(
        {
          success: false,
          error: 'Instagram access token expired',
        },
        { status: 400 }
      );
    }

    // Decrypt token for API calls
    const decryptedToken = await safeDecryptToken(tokenInfo.access_token);

    // Try to resolve mentioned_media from Instagram API
    if (mention.instagram_user_id) {
      try {
        const response = await fetch(
          `${INSTAGRAM_API_BASE}/${mention.instagram_user_id}?fields=mentioned_media.media_type,media_product_type,owner,username,timestamp,permalink&access_token=${decryptedToken}`
        );

        if (response.ok) {
          const data = await response.json();

          if (data.mentioned_media && data.mentioned_media.data) {
            // Find story media close to the mention timestamp
            const mentionTime = new Date(mention.mentioned_at).getTime();
            const timeWindow = 5 * 60 * 1000; // 5 minutes window

            const storyMedia = data.mentioned_media.data.find((media: MediaItem) => {
              const mediaTime = new Date(media.timestamp).getTime();
              return (
                media.media_product_type === 'STORY' &&
                Math.abs(mediaTime - mentionTime) <= timeWindow
              );
            });

            if (storyMedia) {
              // Update mention with resolved data
              const { error: updateError } = await supabase
                .from('social_mentions')
                .update({
                  story_url: storyMedia.permalink || null,
                  instagram_story_id: storyMedia.id || null,
                  raw_data: { ...mention.raw_data, resolved_media: storyMedia },
                })
                .eq('id', mentionId);

              if (updateError) {
                console.error('Error updating mention with resolved data:', updateError);
              } else {
                console.log('Successfully resolved story media for mention');
              }

              return jsonResponse({
                success: true,
                resolved: true,
                story_url: storyMedia.permalink,
                story_id: storyMedia.id,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error calling Instagram API:', error);
      }
    }

    // If we couldn't resolve, create fallback deep link
    const fallbackLink = mention.instagram_username
      ? `https://www.instagram.com/stories/${mention.instagram_username}/`
      : `https://www.instagram.com/${mention.instagram_username || 'unknown'}/`;

    const { error: updateError } = await supabase
      .from('social_mentions')
      .update({
        deep_link: fallbackLink,
        raw_data: { ...mention.raw_data, resolution_attempt: new Date().toISOString() },
      })
      .eq('id', mentionId);

    if (updateError) {
      console.error('Error updating mention with fallback:', updateError);
    }

    return jsonResponse({
      success: true,
      resolved: false,
      fallback_link: fallbackLink,
    });
  } catch (error) {
    return handleError(error);
  }
});
