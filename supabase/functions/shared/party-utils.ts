/**
 * Party Selection Utilities
 * Handles active party queries, quick reply building, and response parsing
 */

import { SupabaseClient } from './types.ts';

/**
 * Active party (fiesta) data structure
 */
export interface ActiveParty {
  id: string;
  name: string;
  description?: string;
  location?: string;
  event_date?: string;
  instagram_handle?: string;
}

/**
 * Quick reply option for Instagram messaging
 */
export interface QuickReplyOption {
  content_type: 'text';
  title: string;
  payload: string;
}

/**
 * Party option stored in social_mentions.party_options_sent
 */
export interface PartyOption {
  id: string;
  name: string;
  payload: string;
}

/**
 * Result of party selection flow determination
 */
export interface PartySelectionResult {
  action: 'auto_match' | 'ask_user' | 'no_parties';
  parties: ActiveParty[];
  matchedPartyId?: string;
}

/**
 * Get active parties for an organization
 * Active = status = 'active' in the fiestas table
 */
export async function getActiveParties(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ActiveParty[]> {
  const { data, error } = await supabase
    .from('fiestas')
    .select('id, name, description, location, event_date, instagram_handle')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('event_date', { ascending: true });

  if (error) {
    console.error('Error fetching active parties:', error);
    return [];
  }

  return data || [];
}

/**
 * Determine the party selection action based on active parties count
 */
export async function determinePartySelectionAction(
  supabase: SupabaseClient,
  organizationId: string
): Promise<PartySelectionResult> {
  const parties = await getActiveParties(supabase, organizationId);

  if (parties.length === 0) {
    return { action: 'no_parties', parties: [] };
  }

  if (parties.length === 1) {
    return {
      action: 'auto_match',
      parties,
      matchedPartyId: parties[0].id
    };
  }

  return { action: 'ask_user', parties };
}

/**
 * Build Instagram quick reply options from parties
 * Limited to 13 options (Instagram's max)
 */
export function buildQuickReplyOptions(parties: ActiveParty[]): QuickReplyOption[] {
  // Instagram limits quick replies to 13 options
  const maxOptions = 13;
  const limitedParties = parties.slice(0, maxOptions);

  return limitedParties.map((party, index) => ({
    content_type: 'text' as const,
    title: truncateText(party.name, 20), // Quick reply titles max 20 chars
    payload: `party_${index + 1}_${party.id}`
  }));
}

/**
 * Build party options array for storing in database
 */
export function buildPartyOptions(parties: ActiveParty[]): PartyOption[] {
  return parties.map((party, index) => ({
    id: party.id,
    name: party.name,
    payload: `party_${index + 1}_${party.id}`
  }));
}

/**
 * Build the party selection message text
 */
export function buildPartySelectionMessage(parties: ActiveParty[]): string {
  const header = '¡Gracias por mencionarnos! 🎉\n\n¿A cuál fiesta corresponde tu historia?\n\n';

  const partyList = parties
    .slice(0, 13) // Limit to match quick replies
    .map((party, index) => {
      const location = party.location ? ` (${party.location})` : '';
      return `${index + 1}. ${party.name}${location}`;
    })
    .join('\n');

  return header + partyList;
}

/**
 * Parse user response to match a party
 * Tries multiple strategies:
 * 1. Quick reply payload match (exact)
 * 2. Number match (1, 2, 3...)
 * 3. Fuzzy text match on party name
 */
export function parsePartyResponse(
  responseText: string,
  responsePayload: string | undefined,
  partyOptions: PartyOption[]
): PartyOption | null {
  // 1. Try quick reply payload match (most reliable)
  if (responsePayload) {
    const matchedByPayload = partyOptions.find(p => p.payload === responsePayload);
    if (matchedByPayload) {
      return matchedByPayload;
    }
  }

  const cleanedText = responseText.trim().toLowerCase();

  // 2. Try number match
  const numberMatch = cleanedText.match(/^(\d+)$/);
  if (numberMatch) {
    const index = parseInt(numberMatch[1], 10) - 1;
    if (index >= 0 && index < partyOptions.length) {
      return partyOptions[index];
    }
  }

  // 3. Try fuzzy text match on party name
  for (const option of partyOptions) {
    const partyNameLower = option.name.toLowerCase();

    // Exact match
    if (cleanedText === partyNameLower) {
      return option;
    }

    // Contains match (party name in response)
    if (cleanedText.includes(partyNameLower)) {
      return option;
    }

    // Response contains in party name
    if (partyNameLower.includes(cleanedText) && cleanedText.length >= 3) {
      return option;
    }
  }

  // 4. Try matching first word only
  const firstWord = cleanedText.split(/\s+/)[0];
  if (firstWord && firstWord.length >= 3) {
    for (const option of partyOptions) {
      if (option.name.toLowerCase().startsWith(firstWord)) {
        return option;
      }
    }
  }

  return null;
}

/**
 * Helper to truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Find pending mention for a user in an organization
 * Used when processing incoming message responses
 */
export async function findPendingMentionForUser(
  supabase: SupabaseClient,
  organizationId: string,
  instagramUserId: string
): Promise<{
  id: string;
  party_options_sent: PartyOption[];
  conversation_id?: string;
} | null> {
  const { data, error } = await supabase
    .from('social_mentions')
    .select('id, party_options_sent, conversation_id')
    .eq('organization_id', organizationId)
    .eq('instagram_user_id', instagramUserId)
    .eq('party_selection_status', 'pending_response')
    .order('party_selection_message_sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error finding pending mention:', error);
    return null;
  }

  return data;
}

/**
 * Update mention with matched party
 */
export async function resolveMentionWithParty(
  supabase: SupabaseClient,
  mentionId: string,
  partyId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('social_mentions')
    .update({
      matched_fiesta_id: partyId,
      party_selection_status: 'resolved',
      processed: true,
      processed_at: new Date().toISOString()
    })
    .eq('id', mentionId);

  if (error) {
    console.error('Error resolving mention with party:', error);
    return false;
  }

  return true;
}

/**
 * Mark mentions as timed out
 * Called by the timeout worker for mentions pending > 4 hours
 */
export async function markMentionsAsTimedOut(
  supabase: SupabaseClient,
  timeoutHours: number = 4
): Promise<number> {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - timeoutHours);

  const { data, error } = await supabase
    .from('social_mentions')
    .update({
      party_selection_status: 'timeout',
      processed: false
    })
    .eq('party_selection_status', 'pending_response')
    .lt('party_selection_message_sent_at', cutoffTime.toISOString())
    .select('id');

  if (error) {
    console.error('Error marking mentions as timed out:', error);
    return 0;
  }

  return data?.length || 0;
}
