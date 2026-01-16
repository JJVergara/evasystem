import { corsHeaders } from '../shared/constants.ts';
import type {
  SupabaseClient,
  Ambassador,
  InsightsData,
  MediaData,
  CommentData,
  MessageData,
  Fiesta,
} from '../shared/types.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';
import { handleError } from '../shared/error-handler.ts';
import { safeDecryptToken } from '../shared/crypto.ts';
import {
  sendInstagramMessage,
  sendInstagramMessageWithQuickReplies,
  fetchAccountInfo,
} from '../shared/instagram-api.ts';

async function getWebhookCredentials(supabaseClient: SupabaseClient, instagramUserId: string) {
  const { data: creds, error: credsError } = await supabaseClient.rpc(
    'get_organization_credentials_by_instagram_user',
    {
      p_instagram_user_id: instagramUserId,
    }
  );

  if (!credsError && creds && creds.length > 0) {
    const orgCreds = creds[0];
    return {
      APP_SECRET: orgCreds.meta_app_secret,
      WEBHOOK_VERIFY_TOKEN: orgCreds.webhook_verify_token,
    };
  }

  return {
    APP_SECRET: Deno.env.get('INSTAGRAM_APP_SECRET'),
    WEBHOOK_VERIFY_TOKEN: Deno.env.get('WEBHOOK_VERIFY_TOKEN'),
  };
}

async function verifyXHubSignature(
  supabaseClient: SupabaseClient,
  payload: string,
  signatureHeader: string | null,
  instagramUserId: string
): Promise<void> {
  const credentials = await getWebhookCredentials(supabaseClient, instagramUserId);
  const APP_SECRET = credentials.APP_SECRET;

  void ('DEBUG: Using APP_SECRET starting with:',
  APP_SECRET ? APP_SECRET.substring(0, 8) + '...' : 'NOT SET');

  if (!APP_SECRET) throw new Error('APP secret not configured');
  if (!signatureHeader || !signatureHeader.startsWith('sha256='))
    throw new Error('Missing signature');

  const signature = signatureHeader.slice(7);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const hashArray = Array.from(new Uint8Array(mac));
  const expected = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

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
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  const url = new URL(req.url);
  const supabase = createSupabaseClient();

  try {
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      void ('Webhook verification request:', { mode, token, challenge });

      const WEBHOOK_VERIFY_TOKEN = Deno.env.get('WEBHOOK_VERIFY_TOKEN');

      if (!WEBHOOK_VERIFY_TOKEN) {
        void 'WEBHOOK_VERIFY_TOKEN is not configured';
        return new Response('Server misconfigured', { status: 500, headers: corsHeaders });
      }

      if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        void 'Webhook verified successfully';
        return new Response(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      } else {
        void 'Webhook verification failed';
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }
    }

    if (req.method === 'POST') {
      const rawBody = await req.text();
      const signatureHeader =
        req.headers.get('x-hub-signature-256') || req.headers.get('X-Hub-Signature-256');

      const body = rawBody ? JSON.parse(rawBody) : {};
      void ('Instagram webhook received:',
      {
        object: body.object,
        entries: Array.isArray(body.entry) ? body.entry.length : 0,
      });

      if (body.object === 'instagram') {
        for (const entry of body.entry || []) {
          void ('Processing entry ID:', entry.id);

          try {
            await verifyXHubSignature(supabase, rawBody, signatureHeader, entry.id);
            void ('Webhook signature verified successfully for entry:', entry.id);
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            void ('Invalid webhook signature for entry:', entry.id, errorMessage);

            try {
              const credentials = await getWebhookCredentials(supabase, entry.id);
              void ('Signature validation failed using:',
              {
                has_org_secret:
                  !!credentials.APP_SECRET &&
                  credentials.APP_SECRET !== Deno.env.get('INSTAGRAM_APP_SECRET'),
                using_fallback: credentials.APP_SECRET === Deno.env.get('INSTAGRAM_APP_SECRET'),
                signature_header: signatureHeader
                  ? `${signatureHeader.substring(0, 15)}...`
                  : 'missing',
              });
            } catch (credError) {
              void ('Could not log credential info:', credError);
            }

            void 'Returning 200 to prevent retry flood despite signature mismatch';
            return new Response(
              JSON.stringify({ received: true, warning: 'signature_mismatch_logged' }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }

          if (entry.changes) {
            for (const change of entry.changes) {
              switch (change.field) {
                case 'media':
                  await handleMediaChange(supabase, change.value, entry.id);
                  break;
                case 'comments':
                  await handleComments(supabase, change.value, entry.id);
                  break;
                case 'messages': {
                  const msgData = change.value;
                  void ('DEBUG: Message from changes:',
                  {
                    hasReferral: !!msgData.referral,
                    referralSource: msgData.referral?.source,
                    referralType: msgData.referral?.type,
                    hasQuickReply: !!msgData.message?.quick_reply,
                    messageKeys: Object.keys(msgData),
                  });

                  if (msgData.message?.quick_reply?.payload) {
                    void ('DEBUG: Quick reply detected:', msgData.message.quick_reply.payload);
                    await handleMessages(
                      supabase,
                      { ...msgData, quick_reply: msgData.message.quick_reply },
                      entry.id
                    );
                  } else if (
                    msgData.referral &&
                    msgData.referral.source === 'SHORTLINK' &&
                    msgData.referral.type === 'STORY'
                  ) {
                    void 'DEBUG: Routing to handleStoryMentionReferral';
                    await handleStoryMentionReferral(supabase, msgData, entry.id);
                  } else {
                    void 'DEBUG: Routing to handleMessages (default)';
                    await handleMessages(supabase, msgData, entry.id);
                  }
                  break;
                }
                case 'story_insights':
                  await handleStoryInsights(supabase, change.value, entry.id);
                  break;
                default:
                  void ('Unhandled webhook field:', change.field);
              }
            }
          }

          if (entry.messaging) {
            for (const message of entry.messaging) {
              void ('DEBUG: Message routing check:',
              {
                hasReferral: !!message.referral,
                referralSource: message.referral?.source,
                referralType: message.referral?.type,
                hasQuickReply: !!message.message?.quick_reply,
                messageKeys: Object.keys(message),
              });

              if (message.message?.quick_reply?.payload) {
                void ('DEBUG: Quick reply detected:', message.message.quick_reply.payload);
                await handleMessages(
                  supabase,
                  { ...message, quick_reply: message.message.quick_reply },
                  entry.id
                );
              } else if (
                message.referral &&
                message.referral.source === 'SHORTLINK' &&
                message.referral.type === 'STORY'
              ) {
                void 'DEBUG: Routing to handleStoryMentionReferral';
                await handleStoryMentionReferral(supabase, message, entry.id);
              } else {
                void 'DEBUG: Routing to handleMessages (default)';
                await handleMessages(supabase, message, entry.id);
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    return handleError(error);
  }
});

async function handleMediaChange(
  supabase: SupabaseClient,
  mediaData: MediaData,
  instagramUserId: string
): Promise<void> {
  try {
    void ('Handling media change:', { mediaId: mediaData?.id, instagramUserId });

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, instagram_username')
      .eq('instagram_user_id', instagramUserId)
      .maybeSingle();

    if (orgError || !organization) {
      void ('Organization not found for Instagram user:', instagramUserId);
      return;
    }

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

    const mentionData = {
      organization_id: organization.id,
      instagram_user_id: instagramUserId,
      instagram_username: mediaData.username || null,
      content: `Historia de Instagram subida`,
      mention_type: 'story',
      instagram_media_id: mediaData.id,
      story_url: null,
      platform: 'instagram',
      raw_data: mediaData,
      matched_ambassador_id: ambassador?.id || null,
      processed: ambassador ? true : false,
    };

    const { data: socialMention, error: mentionError } = await supabase
      .from('social_mentions')
      .insert(mentionData)
      .select()
      .single();

    if (mentionError) {
      void ('Error creating social mention:', mentionError);
    }

    if (ambassador) {
      await supabase.from('notifications').insert({
        organization_id: ambassador.organization_id,
        type: 'story_uploaded',
        message: `${ambassador.first_name} ${ambassador.last_name} subió nuevo contenido en Instagram`,
        target_type: 'ambassador',
        target_id: ambassador.id,
      });
    } else {
      await supabase.from('notifications').insert({
        organization_id: organization.id,
        type: 'story_unassigned',
        message: `Nueva historia de @${mediaData.username || instagramUserId} no asignada a ningún embajador`,
        target_type: 'story',
        target_id: socialMention?.id,
        priority: 'high',
      });

      void ('Ambassador not found for Instagram user:',
      instagramUserId,
      'username:',
      mediaData.username);
    }
  } catch (error) {
    void ('Error handling media change:', error);
  }
}

async function handleComments(
  supabase: SupabaseClient,
  commentData: CommentData,
  instagramUserId: string
): Promise<void> {
  try {
    void ('Handling comment:', { instagramUserId, commentId: commentData?.id });

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, instagram_username')
      .eq('instagram_user_id', instagramUserId)
      .maybeSingle();

    if (orgError || !organization) {
      void ('Organization not found for Instagram user:', instagramUserId);
      return;
    }

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
      processed: ambassador ? true : false,
    };

    const { data: socialMention, error: mentionError } = await supabase
      .from('social_mentions')
      .insert(mentionData)
      .select()
      .single();

    if (mentionError) {
      void ('Error creating social mention for comment:', mentionError);
      return;
    }

    if (ambassador) {
      await supabase.from('notifications').insert({
        organization_id: organization.id,
        type: 'mention',
        message: `${ambassador.first_name} ${ambassador.last_name} ha comentado en Instagram`,
        target_type: 'comment',
        target_id: socialMention.id,
        priority: 'normal',
      });
    } else {
      await supabase.from('notifications').insert({
        organization_id: organization.id,
        type: 'mention_unassigned',
        message: `Nuevo comentario de @${commentData.from?.username || 'usuario desconocido'} - No asignado a embajador`,
        target_type: 'comment',
        target_id: socialMention.id,
        priority: 'medium',
      });
    }

    void ('Comment notification created for organization:', organization.id);
  } catch (error) {
    void ('Error handling comment:', error);
  }
}

async function getActiveFiestas(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Fiesta[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('fiestas')
    .select('id, name, event_date')
    .eq('organization_id', organizationId)
    .gte('event_date', today)
    .eq('status', 'active')
    .order('event_date', { ascending: true })
    .limit(13);

  if (error) {
    void ('Error fetching active fiestas:', error);
    return [];
  }

  return data || [];
}

async function handleFiestaSelectionReply(
  supabase: SupabaseClient,
  messageData: MessageData,
  instagramBusinessAccountId: string
): Promise<boolean> {
  if (!messageData.quick_reply?.payload?.startsWith('FIESTA_SELECT:')) {
    return false;
  }

  const fiestaId = messageData.quick_reply.payload.replace('FIESTA_SELECT:', '');
  const senderId = messageData.sender?.id;

  if (!senderId || !fiestaId) {
    void 'Invalid fiesta selection reply: missing sender or fiesta ID';
    return true;
  }

  void ('Processing fiesta selection reply:', { senderId, fiestaId });

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('instagram_business_account_id', instagramBusinessAccountId)
    .maybeSingle();

  if (orgError || !organization) {
    const { data: orgFallback } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('instagram_user_id', instagramBusinessAccountId)
      .maybeSingle();

    if (!orgFallback) {
      void ('Organization not found for fiesta selection:', instagramBusinessAccountId);
      return true;
    }
    Object.assign(organization || {}, orgFallback);
  }

  if (!organization) {
    void ('Organization not found for fiesta selection:', instagramBusinessAccountId);
    return true;
  }

  const { data: pendingMention, error: mentionError } = await supabase
    .from('social_mentions')
    .select('id, instagram_username')
    .eq('organization_id', organization.id)
    .eq('instagram_user_id', senderId)
    .eq('awaiting_fiesta_selection', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (mentionError || !pendingMention) {
    void ('No pending fiesta selection found for user:', senderId);
    return true;
  }

  const { data: fiesta, error: fiestaError } = await supabase
    .from('fiestas')
    .select('id, name')
    .eq('id', fiestaId)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (fiestaError || !fiesta) {
    void ('Invalid fiesta selected:', fiestaId);
    return true;
  }

  const { error: updateError } = await supabase
    .from('social_mentions')
    .update({
      matched_fiesta_id: fiestaId,
      awaiting_fiesta_selection: false,
      fiesta_selection_expires_at: null,
    })
    .eq('id', pendingMention.id);

  if (updateError) {
    void ('Failed to update mention with fiesta:', updateError);
    return true;
  }

  try {
    const { data: tokenData } = await supabase
      .from('organization_instagram_tokens')
      .select('access_token')
      .eq('organization_id', organization.id)
      .single();

    if (tokenData?.access_token) {
      const decryptedToken = await safeDecryptToken(tokenData.access_token);
      const confirmationMessage = `¡Perfecto! Gracias por compartir sobre ${fiesta.name} 🎊`;

      await sendInstagramMessage(senderId, confirmationMessage, decryptedToken);

      void ('Fiesta selection confirmed:',
      {
        mentionId: pendingMention.id,
        fiestaId: fiesta.id,
        fiestaName: fiesta.name,
      });
    }
  } catch (confirmError) {
    void ('Failed to send confirmation (non-fatal):', confirmError);
  }

  await supabase.from('notifications').insert({
    organization_id: organization.id,
    type: 'fiesta_mention_linked',
    message: `@${pendingMention.instagram_username || 'Usuario'} asoció su historia con ${fiesta.name}`,
    target_type: 'social_mention',
    target_id: pendingMention.id,
    priority: 'normal',
  });

  return true;
}

async function handleMessages(
  supabase: SupabaseClient,
  messageData: MessageData,
  instagramUserId: string
): Promise<void> {
  try {
    void ('Handling message:', { instagramUserId, messageId: messageData?.id });

    if (messageData.quick_reply?.payload) {
      const handled = await handleFiestaSelectionReply(supabase, messageData, instagramUserId);
      if (handled) {
        void 'Message handled as fiesta selection reply';
        return;
      }
    }

    void ('DEBUG: Querying organizations with instagram_user_id =',
    instagramUserId,
    'type:',
    typeof instagramUserId);







    
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, instagram_username')
      .eq('instagram_user_id', instagramUserId)
      .maybeSingle();

    void ('DEBUG: Query result:', { organization, orgError });

    if (orgError || !organization) {
      void ('Organization not found for Instagram user:', instagramUserId);
      return;
    }

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

    let senderUsername = messageData.sender?.username || null;
    if (!senderUsername && messageData.sender?.id) {
      try {
        const { data: tokenData } = await supabase
          .from('organization_instagram_tokens')
          .select('access_token')
          .eq('organization_id', organization.id)
          .single();

        if (tokenData?.access_token) {
          const decryptedToken = await safeDecryptToken(tokenData.access_token);
          const userInfo = await fetchAccountInfo(
            messageData.sender.id,
            decryptedToken,
            'id,username,name'
          );
          senderUsername = userInfo.username || userInfo.name || null;
          void ('Fetched username from Instagram API:', senderUsername);
        }
      } catch (fetchError) {
        void ('Could not fetch username from Instagram API (non-fatal):', fetchError);
      }
    }

    const mentionData = {
      organization_id: organization.id,
      instagram_user_id: messageData.sender?.id || null,
      instagram_username: senderUsername,
      content: messageData.text || 'Mensaje directo de Instagram',
      mention_type: 'mention',
      platform: 'instagram',
      raw_data: messageData,
      matched_ambassador_id: ambassador?.id || null,
      processed: ambassador ? true : false,
    };

    const { data: socialMention, error: mentionError } = await supabase
      .from('social_mentions')
      .insert(mentionData)
      .select()
      .single();

    if (mentionError) {
      void ('Error creating social mention for message:', mentionError);
      return;
    }

    if (ambassador) {
      await supabase.from('notifications').insert({
        organization_id: organization.id,
        type: 'message',
        message: `${ambassador.first_name} ${ambassador.last_name} ha enviado un mensaje directo`,
        target_type: 'message',
        target_id: socialMention.id,
        priority: 'normal',
      });
    } else {
      await supabase.from('notifications').insert({
        organization_id: organization.id,
        type: 'message_unassigned',
        message: `Nuevo mensaje directo de @${messageData.sender?.username || 'usuario desconocido'} - No asignado a embajador`,
        target_type: 'message',
        target_id: socialMention.id,
        priority: 'medium',
      });
    }

    void ('Message notification created for organization:', organization.id);

    if (messageData.sender?.id) {
      try {
        const { data: tokenData, error: tokenError } = await supabase
          .from('organization_instagram_tokens')
          .select('access_token, token_expiry')
          .eq('organization_id', organization.id)
          .single();

        if (tokenError || !tokenData?.access_token) {
          void ('No Instagram token found for auto-response, skipping:', organization.id);
        } else if (tokenData.token_expiry && new Date(tokenData.token_expiry) < new Date()) {
          void ('Instagram token expired for auto-response, skipping:', organization.id);
        } else {
          const decryptedToken = await safeDecryptToken(tokenData.access_token);
          const activeFiestas = await getActiveFiestas(supabase, organization.id);

          if (activeFiestas.length === 0) {
            await sendInstagramMessage(
              messageData.sender.id,
              '¡Gracias por publicarnos! Nos vemos en el evento 🎉',
              decryptedToken
            );
            void 'Simple thank you sent (no active fiestas)';
          } else {
            const quickReplies = activeFiestas.map((fiesta) => ({
              content_type: 'text' as const,
              title: fiesta.name.substring(0, 20),
              payload: `FIESTA_SELECT:${fiesta.id}`,
            }));

            await sendInstagramMessageWithQuickReplies(
              messageData.sender.id,
              '¡Gracias por etiquetarnos! ¿De qué fiesta publicaste?',
              quickReplies,
              decryptedToken
            );

            await supabase
              .from('social_mentions')
              .update({
                awaiting_fiesta_selection: true,
                fiesta_selection_expires_at: new Date(
                  Date.now() + 24 * 60 * 60 * 1000
                ).toISOString(),
              })
              .eq('id', socialMention.id);

            void ('Fiesta selection sent with', activeFiestas.length, 'options');
          }
        }
      } catch (autoResponseError) {
        void ('Failed to send auto-response (non-fatal):', autoResponseError);
      }
    }
  } catch (error) {
    void ('Error handling message:', error);
  }
}

async function handleStoryMentionReferral(
  supabase: SupabaseClient,
  messageData: MessageData,
  instagramBusinessAccountId: string
): Promise<void> {
  try {
    void ('Handling story mention referral (sanitized):',
    {
      instagramBusinessAccountId,
      senderId: messageData.sender?.id,
      referralSource: messageData.referral?.source,
      referralType: messageData.referral?.type,
      hasRefererUri: !!messageData.referral?.referer_uri,
    });

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, instagram_username, facebook_page_id')
      .eq('instagram_business_account_id', instagramBusinessAccountId)
      .maybeSingle();

    if (orgError || !organization) {
      void ('Organization not found for Instagram business account:', instagramBusinessAccountId);
      return;
    }

    const mentionedAt = messageData.timestamp
      ? new Date(messageData.timestamp * 1000).toISOString()
      : new Date().toISOString();

    if (!messageData.sender?.id) {
      void 'No sender ID in story mention referral';
      return;
    }

    const externalEventId = `story_referral_${messageData.mid || messageData.id}_${messageData.sender.id}`;

    const { data: existingMention, error: checkError } = await supabase
      .from('social_mentions')
      .select('id')
      .eq('organization_id', organization.id)
      .eq('instagram_user_id', messageData.sender.id)
      .eq('mentioned_at', mentionedAt)
      .eq('mention_type', 'story_referral')
      .maybeSingle();

    if (checkError) {
      void ('Error checking for existing mention:', checkError);
      return;
    }

    if (existingMention) {
      void ('Story mention referral already processed for user:',
      messageData.sender.id,
      'at:',
      mentionedAt);
      return;
    }

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

    const storyUrl = messageData.referral?.referer_uri || null;
    let deepLink: string | null = null;

    if (messageData.referral?.ref) {
      const storyId = messageData.referral.ref;
      deepLink = `instagram://story-camera/?ref=${storyId}`;
    } else if (storyUrl && storyUrl.includes('instagram.com')) {
      deepLink = storyUrl;
    }

    if (!deepLink && messageData.sender?.username) {
      deepLink = `https://instagram.com/${messageData.sender.username}`;
    }

    const conversationId = messageData.mid || messageData.id || null;
    let inboxLink: string | null = null;

    if (conversationId && organization.facebook_page_id) {
      inboxLink = `https://business.facebook.com/latest/inbox/instagram/${organization.facebook_page_id}/?conversation_id=${conversationId}`;
    }

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
      processed: false,
      reach_count: 0,
      engagement_score: 1.0,
      mentioned_at: mentionedAt,
      state: 'new',
      deep_link: deepLink,
      conversation_id: conversationId,
      inbox_link: inboxLink,
    };

    const { data: socialMention, error: mentionError } = await supabase
      .from('social_mentions')
      .insert(mentionData)
      .select()
      .single();

    if (mentionError) {
      void ('Error creating social mention for story referral:', mentionError);
      return;
    }

    const notificationMessage = ambassador
      ? `${ambassador.first_name} ${ambassador.last_name} mencionó tu historia y envió un mensaje`
      : `Nueva mención de historia de @${messageData.sender?.username || 'usuario desconocido'} - Requiere atención`;

    await supabase.from('notifications').insert({
      organization_id: organization.id,
      type: 'story_mention_referral',
      message: notificationMessage,
      target_type: 'story_mention',
      target_id: socialMention.id,
      priority: 'high',
    });

    try {
      const { data: tokenData, error: tokenError } = await supabase
        .from('organization_instagram_tokens')
        .select('access_token, token_expiry')
        .eq('organization_id', organization.id)
        .single();

      if (tokenError || !tokenData?.access_token) {
        void ('No Instagram token found for auto-response, skipping:', organization.id);
      } else if (tokenData.token_expiry && new Date(tokenData.token_expiry) < new Date()) {
        void ('Instagram token expired for auto-response, skipping:', organization.id);
      } else {
        const decryptedToken = await safeDecryptToken(tokenData.access_token);

        const activeFiestas = await getActiveFiestas(supabase, organization.id);

        if (activeFiestas.length === 0) {
          const simpleMessage = '¡Gracias por publicarnos! Nos vemos en el evento 🎉';

          const sendResult = await sendInstagramMessage(
            messageData.sender.id,
            simpleMessage,
            decryptedToken
          );

          void ('Simple thank you sent (no active fiestas):',
          {
            organizationId: organization.id,
            recipientId: messageData.sender.id,
            messageId: sendResult.message_id,
          });

          await supabase
            .from('social_mentions')
            .update({
              processed: true,
              raw_data: {
                ...messageData,
                auto_response_sent: true,
                auto_response_message_id: sendResult.message_id,
                auto_response_sent_at: new Date().toISOString(),
                no_active_fiestas: true,
              },
            })
            .eq('id', socialMention.id);
        } else {
          const quickReplies = activeFiestas.map((fiesta) => ({
            content_type: 'text' as const,
            title: fiesta.name.substring(0, 20),
            payload: `FIESTA_SELECT:${fiesta.id}`,
          }));

          const selectionMessage = '¡Gracias por etiquetarnos! ¿De qué fiesta publicaste?';

          const sendResult = await sendInstagramMessageWithQuickReplies(
            messageData.sender.id,
            selectionMessage,
            quickReplies,
            decryptedToken
          );

          const selectionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

          await supabase
            .from('social_mentions')
            .update({
              awaiting_fiesta_selection: true,
              fiesta_selection_expires_at: selectionExpiresAt,
              raw_data: {
                ...messageData,
                fiesta_selection_sent: true,
                fiesta_selection_message_id: sendResult.message_id,
                fiesta_selection_sent_at: new Date().toISOString(),
                fiestas_offered: activeFiestas.map((f) => ({ id: f.id, name: f.name })),
              },
            })
            .eq('id', socialMention.id);

          void ('Fiesta selection sent:',
          {
            organizationId: organization.id,
            recipientId: messageData.sender.id,
            messageId: sendResult.message_id,
            fiestasOffered: activeFiestas.length,
          });
        }
      }
    } catch (autoResponseError) {
      void ('Failed to send auto-response (non-fatal):', autoResponseError);
    }

    void ('Story mention referral processed successfully for organization:', organization.id);
  } catch (error) {
    void ('Error handling story mention referral:', error);
  }
}

async function handleStoryInsights(
  supabase: SupabaseClient,
  insightsData: InsightsData,
  instagramBusinessAccountId: string
): Promise<void> {
  try {
    void ('Handling story insights webhook:',
    {
      instagramBusinessAccountId,
      mediaId: insightsData?.media_id,
      hasMetrics: !!insightsData?.metric_values,
    });

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('instagram_business_account_id', instagramBusinessAccountId)
      .maybeSingle();

    if (orgError || !organization) {
      void ('Organization not found for Instagram business account:', instagramBusinessAccountId);
      return;
    }

    const mediaId = insightsData?.media_id || insightsData?.id;

    if (!mediaId) {
      void 'No media ID in story insights data';
      return;
    }

    const { data: storyMention, error: mentionError } = await supabase
      .from('social_mentions')
      .select('id, instagram_story_id, instagram_media_id, mentioned_at')
      .eq('organization_id', organization.id)
      .or(`instagram_story_id.eq.${mediaId},instagram_media_id.eq.${mediaId}`)
      .maybeSingle();

    if (mentionError) {
      void ('Error finding story mention:', mentionError);
      return;
    }

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
      raw: insightsData,
    };

    if (insightsData.metric_values) {
      for (const metric of insightsData.metric_values) {
        if (metric.name && metric.value !== undefined) {
          metrics[metric.name] = metric.value;
        }
      }
    }

    if (storyMention) {
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
        raw_insights: metrics.raw || {},
      };

      const { error: insertError } = await supabase
        .from('story_insights_snapshots')
        .insert(snapshot);

      if (insertError) {
        void ('Error inserting story insights snapshot:', insertError);
      } else {
        void `Created story insights snapshot from webhook for story ${mediaId}`;
      }
    } else {
      void `Story insights received for media ${mediaId} but story mention not found yet`;
    }
  } catch (error) {
    void ('Error handling story insights:', error);
  }
}
