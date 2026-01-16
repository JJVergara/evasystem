import { corsPreflightResponse, jsonResponse, errorResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const supabaseClient = createSupabaseClient();

    void ('Starting OAuth states cleanup...');

    const { data, error } = await supabaseClient
      .from('oauth_states')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      void ('Error cleaning up OAuth states:', error);
      throw error;
    }

    const deletedCount = data?.length || 0;
    void (`Cleaned up ${deletedCount} expired OAuth states`);

    return jsonResponse({
      success: true,
      message: `Cleaned up ${deletedCount} expired OAuth states`,
      deleted_count: deletedCount,
    });
  } catch (error) {
    void ('OAuth cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(errorMessage, 500);
  }
});
