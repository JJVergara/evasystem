/**
 * Party Selection Timeout Worker
 * Marks party selection mentions as 'timeout' if no response received within 4 hours
 * Run via CRON job every 30 minutes
 */

import { corsHeaders } from '../shared/constants.ts';
import { corsPreflightResponse, jsonResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';
import { handleError } from '../shared/error-handler.ts';
import { markMentionsAsTimedOut } from '../shared/party-utils.ts';

const TIMEOUT_HOURS = 4;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  const supabase = createSupabaseClient();

  try {
    console.log('Starting party selection timeout worker...');

    // Mark mentions as timed out
    const timedOutCount = await markMentionsAsTimedOut(supabase, TIMEOUT_HOURS);

    console.log(`Marked ${timedOutCount} mentions as timed out`);

    // If there were timeouts, create notifications for each organization
    if (timedOutCount > 0) {
      // Get timed out mentions grouped by organization
      const { data: timedOutMentions, error: fetchError } = await supabase
        .from('social_mentions')
        .select('id, organization_id, instagram_username')
        .eq('party_selection_status', 'timeout')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Last 30 minutes

      if (!fetchError && timedOutMentions) {
        // Group by organization
        const byOrg = timedOutMentions.reduce((acc, mention) => {
          if (!acc[mention.organization_id]) {
            acc[mention.organization_id] = [];
          }
          acc[mention.organization_id].push(mention);
          return acc;
        }, {} as Record<string, typeof timedOutMentions>);

        // Create notification per organization
        for (const [orgId, mentions] of Object.entries(byOrg)) {
          const usernames = mentions
            .map(m => m.instagram_username ? `@${m.instagram_username}` : 'usuario')
            .slice(0, 3)
            .join(', ');

          const extra = mentions.length > 3 ? ` y ${mentions.length - 3} más` : '';

          await supabase
            .from('notifications')
            .insert({
              organization_id: orgId,
              type: 'party_selection_timeout',
              message: `${mentions.length} mención(es) sin respuesta de fiesta (${usernames}${extra}) - requieren asignación manual`,
              target_type: 'social_mentions',
              priority: 'medium'
            });
        }
      }
    }

    return jsonResponse({
      success: true,
      timedOutCount,
      message: `Processed ${timedOutCount} timed out mentions`
    });

  } catch (error) {
    console.error('Party selection timeout worker error:', error);
    return handleError(error);
  }
});
