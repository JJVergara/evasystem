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

    const { organizationId, mentionId } = await req.json();
    
    // Validate required parameters
    if (!mentionId) {
      console.error('Missing mentionId parameter');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing mentionId parameter' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!organizationId) {
      console.error('Missing organizationId parameter');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing organizationId parameter' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Mention not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
          processed_at: new Date().toISOString()
        })
        .eq('id', mentionId);

      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No Instagram access token available' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if token is expired
    if (tokenInfo.token_expiry && new Date(tokenInfo.token_expiry) < new Date()) {
      console.error('Instagram token expired');
      
      await supabase
        .from('social_mentions')
        .update({ 
          state: 'expired_unknown',
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', mentionId);

      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Instagram access token expired' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Decrypt token for API calls
    const decryptedToken = await safeDecryptToken(tokenInfo.access_token);

    // Try to resolve mentioned_media from Instagram API
    if (mention.instagram_user_id) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${mention.instagram_user_id}?fields=mentioned_media.media_type,media_product_type,owner,username,timestamp,permalink&access_token=${decryptedToken}`
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data.mentioned_media && data.mentioned_media.data) {
            // Find story media close to the mention timestamp
            const mentionTime = new Date(mention.mentioned_at).getTime();
            const timeWindow = 5 * 60 * 1000; // 5 minutes window
            
            const storyMedia = data.mentioned_media.data.find((media: any) => {
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
                  raw_data: { ...mention.raw_data, resolved_media: storyMedia }
                })
                .eq('id', mentionId);

              if (updateError) {
                console.error('Error updating mention with resolved data:', updateError);
              } else {
                console.log('Successfully resolved story media for mention');
              }

              return new Response(JSON.stringify({ 
                success: true,
                resolved: true,
                story_url: storyMedia.permalink,
                story_id: storyMedia.id
              }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        raw_data: { ...mention.raw_data, resolution_attempt: new Date().toISOString() }
      })
      .eq('id', mentionId);

    if (updateError) {
      console.error('Error updating mention with fallback:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      resolved: false,
      fallback_link: fallbackLink
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Resolve story mentions error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});