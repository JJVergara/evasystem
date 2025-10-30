import { corsHeaders, META_API_BASE, STORY_INSIGHTS_METRICS } from '../shared/constants.ts';
import { SupabaseClient, Organization, Ambassador, InsightsData, MediaData, CommentData, MessageData } from '../shared/types.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';
import { handleError } from '../shared/error-handler.ts';
import { safeDecryptToken } from '../shared/crypto.ts';


async function getOrganizationWebhookToken(supabaseClient: SupabaseClient, instagramUserId: string): Promise<string | undefined> {
  // Try to find organization by Instagram user ID and get its webhook token using secure function
  const { data: creds, error: credsError } = await supabaseClient
    .rpc('get_organization_credentials_by_instagram_user', {
      p_instagram_user_id: instagramUserId
    });

  if (!credsError && creds && creds.length > 0 && creds[0].webhook_verify_token) {
    return creds[0].webhook_verify_token;
  }

  // Fallback to global token
  return Deno.env.get('WEBHOOK_VERIFY_TOKEN');
}

async function getWebhookCredentials(supabaseClient: SupabaseClient, instagramUserId: string) {
  // Try to find organization-specific credentials using secure function
  const { data: creds, error: credsError } = await supabaseClient
    .rpc('get_organization_credentials_by_instagram_user', {
      p_instagram_user_id: instagramUserId
    });

  if (!credsError && creds && creds.length > 0) {
    const orgCreds = creds[0];
    return {
      APP_SECRET: orgCreds.meta_app_secret,
      WEBHOOK_VERIFY_TOKEN: orgCreds.webhook_verify_token
    };
  }

  // Fallback to global credentials
  return {
    APP_SECRET: Deno.env.get('META_APP_SECRET'),
    WEBHOOK_VERIFY_TOKEN: Deno.env.get('WEBHOOK_VERIFY_TOKEN')
  };
}

async function verifyXHubSignature(supabaseClient: SupabaseClient, payload: string, signatureHeader: string | null, instagramUserId: string): Promise<void> {
  const credentials = await getWebhookCredentials(supabaseClient, instagramUserId);
  const APP_SECRET = credentials.APP_SECRET;
  
  if (!APP_SECRET) throw new Error('APP secret not configured');
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) throw new Error('Missing signature');
  
  const signature = signatureHeader.slice(7);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(APP_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const hashArray = Array.from(new Uint8Array(mac));
  const expected = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  if (expected.length !== signature.length || !timingSafeEqual(expected, signature)) {
    throw new Error('Signature mismatch');
  }
}

function timingSafeEqual(a: string, b: string) {
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  const url = new URL(req.url);
  const supabase = createSupabaseClient();
  
  try {
    // Webhook verification (GET request from Meta)
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log('Webhook verification request:', { mode, token, challenge });

      // For verification, we can use global token as fallback since we don't know the Instagram user yet
      const WEBHOOK_VERIFY_TOKEN = Deno.env.get('WEBHOOK_VERIFY_TOKEN');
      
      if (!WEBHOOK_VERIFY_TOKEN) {
        console.error('WEBHOOK_VERIFY_TOKEN is not configured');
        return new Response('Server misconfigured', { status: 500, headers: corsHeaders });
      }

      if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        console.log('Webhook verified successfully');
        return new Response(challenge, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      } else {
        console.log('Webhook verification failed');
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }
    }

    // Handle webhook events (POST request from Instagram)
    if (req.method === 'POST') {
      // Read raw body for signature verification
      const rawBody = await req.text();
      const signatureHeader = req.headers.get('x-hub-signature-256') || req.headers.get('X-Hub-Signature-256');
      
      const body = rawBody ? JSON.parse(rawBody) : {};
      console.log('Instagram webhook received:', { object: body.object, entries: Array.isArray(body.entry) ? body.entry.length : 0 });

      // Process webhook data
      if (body.object === 'instagram') {
        for (const entry of body.entry || []) {
          console.log('Processing entry ID:', entry.id);
          
          // Verify signature using organization-specific credentials if possible
          try {
            await verifyXHubSignature(supabase, rawBody, signatureHeader, entry.id);
            console.log('Webhook signature verified successfully for entry:', entry.id);
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.error('Invalid webhook signature for entry:', entry.id, errorMessage);
            
            // Try to log which credentials were attempted
            try {
              const credentials = await getWebhookCredentials(supabase, entry.id);
              console.error('Signature validation failed using:', {
                has_org_secret: !!credentials.APP_SECRET && credentials.APP_SECRET !== Deno.env.get('META_APP_SECRET'),
                using_fallback: credentials.APP_SECRET === Deno.env.get('META_APP_SECRET'),
                signature_header: signatureHeader ? `${signatureHeader.substring(0, 15)}...` : 'missing'
              });
            } catch (credError) {
              console.error('Could not log credential info:', credError);
            }
            
            return new Response(JSON.stringify({ error: 'invalid_signature' }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          // Handle different types of changes
          if (entry.changes) {
            for (const change of entry.changes) {
              switch (change.field) {
                case 'media':
                  await handleMediaChange(supabase, change.value, entry.id);
                  break;
                case 'comments':
                  await handleComments(supabase, change.value, entry.id);
                  break;
                case 'messages':
                  await handleMessages(supabase, change.value, entry.id);
                  break;
                case 'story_insights':
                  await handleStoryInsights(supabase, change.value, entry.id);
                  break;
                default:
                  console.log('Unhandled webhook field:', change.field);
              }
            }
          }

          // Handle messaging events
          if (entry.messaging) {
            for (const message of entry.messaging) {
              // Check if it's a story mention referral
              if (message.referral && message.referral.source === 'SHORTLINK' && message.referral.type === 'STORY') {
                await handleStoryMentionReferral(supabase, message, entry.id);
              } else {
                await handleMessages(supabase, message, entry.id);
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error) {
    return handleError(error);
  }
});

async function handleMediaChange(supabase: SupabaseClient, mediaData: MediaData, instagramUserId: string): Promise<void> {
  try {
    console.log('Handling media change:', { mediaId: mediaData?.id, instagramUserId });

    // First try to find organization by Instagram user ID
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, instagram_handle')
      .eq('instagram_user_id', instagramUserId)
      .maybeSingle();

    if (orgError || !organization) {
      console.log('Organization not found for Instagram user:', instagramUserId);
      return;
    }

    // Try to find ambassador by Instagram user ID first
    let ambassador: Ambassador | null = null;
    
    const { data: ambassadorById, error: ambassadorByIdError } = await supabase
      .from('embassadors')
      .select('*')
      .eq('instagram_user_id', instagramUserId)
      .eq('organization_id', organization.id)
      .maybeSingle();

    if (!ambassadorByIdError && ambassadorById) {
      ambassador = ambassadorById;
    } else {
      // Fallback: try to find by normalized username if we have media info with username
      if (mediaData.username) {
        const normalizedUsername = mediaData.username.toLowerCase().replace('@', '');
        const { data: ambassadorByUsername, error: ambassadorByUsernameError } = await supabase
          .from('embassadors')
          .select('*')
          .eq('organization_id', organization.id)
          .ilike('instagram_user', `%${normalizedUsername}%`)
          .maybeSingle();

        if (!ambassadorByUsernameError && ambassadorByUsername) {
          ambassador = ambassadorByUsername;
        }
      }
    }

    // Create entry in social_mentions table
    const mentionData = {
      organization_id: organization.id,
      instagram_user_id: instagramUserId,
      instagram_username: mediaData.username || null,
      content: `Historia de Instagram subida`,
      mention_type: 'story',
      instagram_media_id: mediaData.id,
      story_url: null, // This will be updated later if available
      platform: 'instagram',
      raw_data: mediaData,
      matched_ambassador_id: ambassador?.id || null,
      processed: ambassador ? true : false
    };

    const { data: socialMention, error: mentionError } = await supabase
      .from('social_mentions')
      .insert(mentionData)
      .select()
      .single();

    if (mentionError) {
      console.error('Error creating social mention:', mentionError);
    }

    if (ambassador) {
      // Create notification for matched ambassador
      await supabase
        .from('notifications')
        .insert({
          organization_id: ambassador.organization_id,
          type: 'story_uploaded',
          message: `${ambassador.first_name} ${ambassador.last_name} subió nuevo contenido en Instagram`,
          target_type: 'ambassador',
          target_id: ambassador.id,
        });
    } else {
      // Create notification for unassigned story
      await supabase
        .from('notifications')
        .insert({
          organization_id: organization.id,
          type: 'story_unassigned',
          message: `Nueva historia de @${mediaData.username || instagramUserId} no asignada a ningún embajador`,
          target_type: 'story',
          target_id: socialMention?.id,
          priority: 'high'
        });

      console.log('Ambassador not found for Instagram user:', instagramUserId, 'username:', mediaData.username);
    }

  } catch (error) {
    console.error('Error handling media change:', error);
  }
}

async function handleComments(supabase: SupabaseClient, commentData: CommentData, instagramUserId: string): Promise<void> {
  try {
    console.log('Handling comment:', { instagramUserId, commentId: commentData?.id });

    // Find organization by Instagram user ID
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, instagram_handle')
      .eq('instagram_user_id', instagramUserId)
      .maybeSingle();

    if (orgError || !organization) {
      console.log('Organization not found for Instagram user:', instagramUserId);
      return;
    }

    // Try to find ambassador by username if available
    let ambassador: Ambassador | null = null;
    if (commentData.from?.username) {
      const { data: ambassadorByUsername, error: ambassadorError } = await supabase
        .from('embassadors')
        .select('*')
        .eq('instagram_user', commentData.from.username)
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (!ambassadorError && ambassadorByUsername) {
        ambassador = ambassadorByUsername;
      }
    }

    // Create entry in social_mentions table
    const mentionData = {
      organization_id: organization.id,
      instagram_user_id: commentData.from?.id || null,
      instagram_username: commentData.from?.username || null,
      content: commentData.text || 'Comentario en Instagram',
      mention_type: 'comment',
      instagram_media_id: commentData.media?.id || null,
      platform: 'instagram',
      raw_data: commentData,
      matched_ambassador_id: ambassador?.id || null,
      processed: ambassador ? true : false
    };

    const { data: socialMention, error: mentionError } = await supabase
      .from('social_mentions')
      .insert(mentionData)
      .select()
      .single();

    if (mentionError) {
      console.error('Error creating social mention for comment:', mentionError);
      return;
    }

    if (ambassador) {
      // Create notification for assigned comment
      await supabase
        .from('notifications')
        .insert({
          organization_id: organization.id,
          type: 'mention',
          message: `${ambassador.first_name} ${ambassador.last_name} ha comentado en Instagram`,
          target_type: 'comment',
          target_id: socialMention.id,
          priority: 'normal'
        });
    } else {
      // Create notification for unassigned comment
      await supabase
        .from('notifications')
        .insert({
          organization_id: organization.id,
          type: 'mention_unassigned',
          message: `Nuevo comentario de @${commentData.from?.username || 'usuario desconocido'} - No asignado a embajador`,
          target_type: 'comment',
          target_id: socialMention.id,
          priority: 'medium'
        });
    }

    console.log('Comment notification created for organization:', organization.id);

  } catch (error) {
    console.error('Error handling comment:', error);
  }
}

async function handleMessages(supabase: SupabaseClient, messageData: MessageData, instagramUserId: string): Promise<void> {
  try {
    console.log('Handling message:', { instagramUserId, messageId: messageData?.id });

    // Find organization by Instagram user ID
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, instagram_handle')
      .eq('instagram_user_id', instagramUserId)
      .maybeSingle();

    if (orgError || !organization) {
      console.log('Organization not found for Instagram user:', instagramUserId);
      return;
    }

    // Try to find ambassador by user ID if available
    let ambassador: Ambassador | null = null;
    if (messageData.sender?.id) {
      const { data: ambassadorById, error: ambassadorError } = await supabase
        .from('embassadors')
        .select('*')
        .eq('instagram_user_id', messageData.sender.id)
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (!ambassadorError && ambassadorById) {
        ambassador = ambassadorById;
      }
    }

    // Create entry in social_mentions table
    const mentionData = {
      organization_id: organization.id,
      instagram_user_id: messageData.sender?.id || null,
      instagram_username: messageData.sender?.username || null,
      content: messageData.text || 'Mensaje directo de Instagram',
      mention_type: 'mention',
      platform: 'instagram',
      raw_data: messageData,
      matched_ambassador_id: ambassador?.id || null,
      processed: ambassador ? true : false
    };

    const { data: socialMention, error: mentionError } = await supabase
      .from('social_mentions')
      .insert(mentionData)
      .select()
      .single();

    if (mentionError) {
      console.error('Error creating social mention for message:', mentionError);
      return;
    }

    if (ambassador) {
      // Create notification for assigned message
      await supabase
        .from('notifications')
        .insert({
          organization_id: organization.id,
          type: 'message',
          message: `${ambassador.first_name} ${ambassador.last_name} ha enviado un mensaje directo`,
          target_type: 'message',
          target_id: socialMention.id,
          priority: 'normal'
        });
    } else {
      // Create notification for unassigned message
      await supabase
        .from('notifications')
        .insert({
          organization_id: organization.id,
          type: 'message_unassigned',
          message: `Nuevo mensaje directo de @${messageData.sender?.username || 'usuario desconocido'} - No asignado a embajador`,
          target_type: 'message',
          target_id: socialMention.id,
          priority: 'medium'
        });
    }

    console.log('Message notification created for organization:', organization.id);

  } catch (error) {
    console.error('Error handling message:', error);
  }
}

async function handleStoryMentionReferral(supabase: SupabaseClient, messageData: MessageData, instagramBusinessAccountId: string): Promise<void> {
  try {
    console.log('Handling story mention referral (sanitized):', { 
      instagramBusinessAccountId, 
      senderId: messageData.sender?.id,
      referralSource: messageData.referral?.source,
      referralType: messageData.referral?.type,
      hasRefererUri: !!messageData.referral?.referer_uri
    });

    // Find organization by Instagram business account ID
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, instagram_username, facebook_page_id')
      .eq('instagram_business_account_id', instagramBusinessAccountId)
      .maybeSingle();

    if (orgError || !organization) {
      console.log('Organization not found for Instagram business account:', instagramBusinessAccountId);
      return;
    }

    // Extract mention time from message timestamp or use current time
    const mentionedAt = messageData.timestamp ? new Date(messageData.timestamp * 1000).toISOString() : new Date().toISOString();

    // Ensure sender exists
    if (!messageData.sender?.id) {
      console.log('No sender ID in story mention referral');
      return;
    }

    // Create unique external event ID for idempotency
    const externalEventId = `story_referral_${messageData.mid || messageData.id}_${messageData.sender.id}`;

    // Check if we already processed this event using the new unique index
    const { data: existingMention, error: checkError } = await supabase
      .from('social_mentions')
      .select('id')
      .eq('organization_id', organization.id)
      .eq('instagram_user_id', messageData.sender.id)
      .eq('mentioned_at', mentionedAt)
      .eq('mention_type', 'story_referral')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing mention:', checkError);
      return;
    }

    if (existingMention) {
      console.log('Story mention referral already processed for user:', messageData.sender.id, 'at:', mentionedAt);
      return;
    }

    // Try to find ambassador by Instagram user ID
    let ambassador: Ambassador | null = null;
    if (messageData.sender?.id) {
      const { data: ambassadorById, error: ambassadorError } = await supabase
        .from('embassadors')
        .select('*')
        .eq('instagram_user_id', messageData.sender.id)
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (!ambassadorError && ambassadorById) {
        ambassador = ambassadorById;
      }
    }

    // Extract story URL and try to build deep link
    const storyUrl = messageData.referral?.referer_uri || null;
    let deepLink: string | null = null;
    
    // Try to extract story ID from referral for deep link
    if (messageData.referral?.ref) {
      const storyId = messageData.referral.ref;
      // Try to build Instagram deep link (may not always work)
      deepLink = `instagram://story-camera/?ref=${storyId}`;
    } else if (storyUrl && storyUrl.includes('instagram.com')) {
      deepLink = storyUrl;
    }
    
    // If no deep link possible, create profile link
    if (!deepLink && messageData.sender?.username) {
      deepLink = `https://instagram.com/${messageData.sender.username}`;
    }

    // Extract conversation ID and build inbox link
    const conversationId = messageData.mid || messageData.id || null;
    let inboxLink: string | null = null;
    
    // Build Instagram inbox link if we have conversation ID and page info
    if (conversationId && organization.facebook_page_id) {
      // Meta Business Inbox link format for Instagram conversations
      inboxLink = `https://business.facebook.com/latest/inbox/instagram/${organization.facebook_page_id}/?conversation_id=${conversationId}`;
    }
    
    // Create entry in social_mentions table
    const mentionData = {
      organization_id: organization.id,
      external_event_id: externalEventId,
      recipient_page_id: organization.facebook_page_id,
      instagram_user_id: messageData.sender?.id || null,
      instagram_username: messageData.sender?.username || null,
      content: `Mención desde historia de Instagram - ${messageData.text || 'Usuario llegó a través de referencia de historia'}`,
      mention_type: 'story_referral',
      platform: 'instagram',
      story_url: storyUrl,
      instagram_story_id: messageData.referral?.ref || null,
      raw_data: messageData,
      matched_ambassador_id: ambassador?.id || null,
      processed: false, // Always start as unprocessed for story mentions
      reach_count: 0,
      engagement_score: 1.0, // Story mentions have high engagement value
      mentioned_at: mentionedAt,
      state: 'new',
      deep_link: deepLink,
      conversation_id: conversationId,
      inbox_link: inboxLink
    };

    const { data: socialMention, error: mentionError } = await supabase
      .from('social_mentions')
      .insert(mentionData)
      .select()
      .single();

    if (mentionError) {
      console.error('Error creating social mention for story referral:', mentionError);
      return;
    }

    // Always create a notification for story mentions (high priority)
    const notificationMessage = ambassador 
      ? `${ambassador.first_name} ${ambassador.last_name} mencionó tu historia y envió un mensaje`
      : `Nueva mención de historia de @${messageData.sender?.username || 'usuario desconocido'} - Requiere atención`;

    await supabase
      .from('notifications')
      .insert({
        organization_id: organization.id,
        type: 'story_mention_referral',
        message: notificationMessage,
        target_type: 'story_mention',
        target_id: socialMention.id,
        priority: 'high' // Story mentions are always high priority
      });

    console.log('Story mention referral processed successfully for organization:', organization.id);

  } catch (error) {
    console.error('Error handling story mention referral:', error);
  }
}



async function handleStoryInsights(supabase: SupabaseClient, insightsData: InsightsData, instagramBusinessAccountId: string): Promise<void> {
  try {
    console.log('Handling story insights webhook:', { 
      instagramBusinessAccountId,
      mediaId: insightsData?.media_id,
      hasMetrics: !!insightsData?.metric_values
    });

    // Find organization by Instagram business account ID
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('instagram_business_account_id', instagramBusinessAccountId)
      .maybeSingle();

    if (orgError || !organization) {
      console.log('Organization not found for Instagram business account:', instagramBusinessAccountId);
      return;
    }

    const mediaId = insightsData?.media_id || insightsData?.id;
    
    if (!mediaId) {
      console.log('No media ID in story insights data');
      return;
    }

    // Try to find the story in our social_mentions table
    const { data: storyMention, error: mentionError } = await supabase
      .from('social_mentions')
      .select('id, instagram_story_id, instagram_media_id, mentioned_at')
      .eq('organization_id', organization.id)
      .or(`instagram_story_id.eq.${mediaId},instagram_media_id.eq.${mediaId}`)
      .maybeSingle();

    if (mentionError) {
      console.error('Error finding story mention:', mentionError);
      return;
    }

    // Parse insights metrics from webhook data
    interface MetricsMap {
      impressions?: number;
      reach?: number;
      replies?: number;
      exits?: number;
      taps_forward?: number;
      taps_back?: number;
      shares?: number;
      navigation?: Record<string, unknown>;
      raw?: InsightsData;
      [key: string]: number | Record<string, unknown> | InsightsData | undefined;
    }
    
    const metrics: MetricsMap = {
      raw: insightsData
    };

    // The webhook data structure varies, but typically contains metric_values
    if (insightsData.metric_values) {
      for (const metric of insightsData.metric_values) {
        if (metric.name && metric.value !== undefined) {
          metrics[metric.name] = metric.value;
        }
      }
    }

    // If we found the story mention, create a snapshot
    if (storyMention) {
      // Calculate story age
      const storyAge = storyMention.mentioned_at 
        ? (new Date().getTime() - new Date(storyMention.mentioned_at).getTime()) / (1000 * 60 * 60)
        : null;

      const snapshot = {
        social_mention_id: storyMention.id,
        organization_id: organization.id,
        instagram_story_id: storyMention.instagram_story_id,
        instagram_media_id: mediaId,
        snapshot_at: new Date().toISOString(),
        story_age_hours: storyAge,
        impressions: metrics.impressions || 0,
        reach: metrics.reach || 0,
        replies: metrics.replies || 0,
        exits: metrics.exits || 0,
        taps_forward: metrics.taps_forward || 0,
        taps_back: metrics.taps_back || 0,
        shares: metrics.shares || 0,
        navigation: metrics.navigation || {},
        raw_insights: metrics.raw || {}
      };

      const { error: insertError } = await supabase
        .from('story_insights_snapshots')
        .insert(snapshot);

      if (insertError) {
        console.error('Error inserting story insights snapshot:', insertError);
      } else {
        console.log(`Created story insights snapshot from webhook for story ${mediaId}`);
      }
    } else {
      // Story not found in our database yet - this might be a story we don't track
      // or it might arrive before the story_mention webhook
      console.log(`Story insights received for media ${mediaId} but story mention not found yet`);
      
      // We could optionally queue this for later processing or create a placeholder
      // For now, we'll just log it
    }

  } catch (error) {
    console.error('Error handling story insights:', error);
  }
}
