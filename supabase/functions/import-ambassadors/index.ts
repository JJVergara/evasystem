/**
 * Import Ambassadors Edge Function
 * Handles bulk import of ambassadors for an organization
 */

import {
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  badRequestResponse,
} from '../shared/responses.ts';
import { authenticateRequest, getUserOrganization } from '../shared/auth.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // Authenticate request
    const authResult = await authenticateRequest(req, { requireAuth: true });
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user, supabase } = authResult;

    // Parse request body
    const { ambassadors, organizationId } = await req.json();
    if (!ambassadors || !Array.isArray(ambassadors)) {
      return badRequestResponse('Ambassadors array is required');
    }

    // Get user's organization
    const userOrgId = await getUserOrganization(supabase, user.id);
    if (!userOrgId) {
      return errorResponse('User has no organization', 400);
    }

    // Validate organization access
    if (userOrgId !== organizationId) {
      return errorResponse('No tienes permiso para importar embajadores a esta organización', 403);
    }

    // Get user record for created_by
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (userDataError || !userData) {
      return errorResponse('User record not found', 404);
    }

    // Get existing ambassadors to check for duplicates
    const { data: existingAmbassadors } = await supabase
      .from('embassadors')
      .select('email, rut')
      .eq('organization_id', organizationId);

    const existingEmails = new Set(existingAmbassadors?.map((a) => a.email) || []);
    const existingRuts = new Set(existingAmbassadors?.map((a) => a.rut) || []);

    const results: {
      successful: number;
      failed: number;
      duplicates: number;
      errors: string[];
    } = {
      successful: 0,
      failed: 0,
      duplicates: 0,
      errors: [],
    };

    const validAmbassadors = [];

    for (const ambassador of ambassadors) {
      // Check for duplicates
      if (existingEmails.has(ambassador.email) || existingRuts.has(ambassador.rut)) {
        results.duplicates++;
        results.errors.push(
          `Duplicado: ${ambassador.first_name} ${ambassador.last_name} (${ambassador.email})`
        );
        continue;
      }

      // Validate required fields
      if (!ambassador.first_name || !ambassador.last_name || !ambassador.email || !ambassador.rut) {
        results.failed++;
        results.errors.push(
          `Campos requeridos faltantes: ${ambassador.first_name} ${ambassador.last_name}`
        );
        continue;
      }

      validAmbassadors.push({
        first_name: ambassador.first_name,
        last_name: ambassador.last_name,
        email: ambassador.email,
        rut: ambassador.rut,
        date_of_birth: ambassador.date_of_birth,
        instagram_user: ambassador.instagram_user || `@${ambassador.first_name.toLowerCase()}`,
        follower_count: ambassador.follower_count || 0,
        organization_id: organizationId,
        created_by_user_id: userData.id,
        status: 'pending',
        global_category: 'bronze',
        performance_status: 'cumple',
        profile_public: true,
        global_points: 0,
        events_participated: 0,
        completed_tasks: 0,
        failed_tasks: 0,
      });

      // Add to existing sets to prevent duplicates within the same import
      existingEmails.add(ambassador.email);
      existingRuts.add(ambassador.rut);
    }

    // Bulk insert valid ambassadors
    if (validAmbassadors.length > 0) {
      const { data: insertResult, error: insertError } = await supabase
        .from('embassadors')
        .insert(validAmbassadors)
        .select();

      if (insertError) {
        throw new Error(`Error en importación masiva: ${insertError.message}`);
      }

      results.successful = insertResult.length;
    }

    // Create import log
    await supabase.from('import_logs').insert({
      user_id: userData.id,
      organization_id: organizationId,
      type: 'embassadors',
      source: 'manual_import',
      file_name: 'bulk_import.json',
      status: 'completed',
      result_json: results,
    });

    // Create feedback card
    await supabase.rpc('create_feedback_card', {
      p_user_id: userData.id,
      p_event_id: null,
      p_type: results.failed > 0 ? 'warning' : 'success',
      p_message: `Importación completada: ${results.successful} exitosos, ${results.failed} fallidos, ${results.duplicates} duplicados`,
    });

    // Create event log
    await supabase.rpc('create_event_log', {
      p_user_id: userData.id,
      p_event_id: null,
      p_action: 'ambassadors_imported',
      p_details: {
        total_processed: ambassadors.length,
        successful: results.successful,
        failed: results.failed,
        duplicates: results.duplicates,
        import_timestamp: new Date().toISOString(),
      },
    });

    return jsonResponse({
      success: true,
      message: 'Importación de embajadores completada',
      data: results,
    });
  } catch (error) {
    console.error('Error in import-ambassadors:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return jsonResponse(
      {
        success: false,
        message: 'Error en importación de embajadores',
        error: errorMessage,
      },
      { status: 400 }
    );
  }
});
