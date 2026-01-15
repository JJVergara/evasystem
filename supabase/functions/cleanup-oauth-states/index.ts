/**
 * Cleanup OAuth States Edge Function
 * Removes expired OAuth state records for security
 */

import { corsPreflightResponse, jsonResponse, errorResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // Initialize Supabase client with service role for cleanup operations
    const supabaseClient = createSupabaseClient();

    console.log('Starting OAuth states cleanup...');

    // Delete expired OAuth states
    const { data, error } = await supabaseClient
      .from('oauth_states')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Error cleaning up OAuth states:', error);
      throw error;
    }

    const deletedCount = data?.length || 0;
    console.log(`Cleaned up ${deletedCount} expired OAuth states`);

    return jsonResponse({
      success: true,
      message: `Cleaned up ${deletedCount} expired OAuth states`,
      deleted_count: deletedCount
    });

  } catch (error) {
    console.error('OAuth cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(errorMessage, 500);
  }
});
