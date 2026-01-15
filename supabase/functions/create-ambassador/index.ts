/**
 * Create Ambassador Edge Function
 * Creates a new ambassador for an organization
 */

import { corsHeaders } from '../shared/constants.ts';
import { corsPreflightResponse, jsonResponse, errorResponse, badRequestResponse } from '../shared/responses.ts';
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
    const { ambassadorData } = await req.json();
    if (!ambassadorData) {
      return badRequestResponse('Ambassador data is required');
    }

    // Get user's organization
    const organizationId = await getUserOrganization(supabase, user.id);
    if (!organizationId) {
      return errorResponse('User has no organization', 400);
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

    // Check for existing ambassador with same email or RUT
    const { data: existingAmbassador } = await supabase
      .from('embassadors')
      .select('id, email, rut')
      .eq('organization_id', organizationId)
      .or(`email.eq.${ambassadorData.email},rut.eq.${ambassadorData.rut}`)
      .single();

    if (existingAmbassador) {
      return badRequestResponse('Ya existe un embajador con ese email o RUT');
    }

    // Create ambassador
    const { data: ambassadorResult, error: ambassadorError } = await supabase
      .from('embassadors')
      .insert({
        first_name: ambassadorData.first_name,
        last_name: ambassadorData.last_name,
        email: ambassadorData.email,
        rut: ambassadorData.rut,
        date_of_birth: ambassadorData.date_of_birth,
        instagram_user: ambassadorData.instagram_user,
        follower_count: ambassadorData.follower_count || 0,
        organization_id: organizationId,
        created_by_user_id: userData.id,
        status: 'pending',
        global_category: 'bronze',
        performance_status: 'cumple',
        profile_public: true,
        global_points: 0,
        events_participated: 0,
        completed_tasks: 0,
        failed_tasks: 0
      })
      .select()
      .single();

    if (ambassadorError) {
      console.error('Error creating ambassador:', ambassadorError);
      return errorResponse(`Error creating ambassador: ${ambassadorError.message}`, 400);
    }

    // Create success feedback card
    await supabase.rpc('create_feedback_card', {
      p_user_id: userData.id,
      p_event_id: null,
      p_type: 'success',
      p_message: `Embajador "${ambassadorData.first_name} ${ambassadorData.last_name}" creado exitosamente. Estado: Pendiente de aprobación.`
    });

    // Create ambassador log
    await supabase.rpc('create_event_log', {
      p_user_id: userData.id,
      p_event_id: null,
      p_action: 'ambassador_created',
      p_details: {
        ambassador_name: `${ambassadorData.first_name} ${ambassadorData.last_name}`,
        instagram_user: ambassadorData.instagram_user,
        email: ambassadorData.email,
        created_timestamp: new Date().toISOString()
      }
    });

    return jsonResponse({
      success: true,
      message: 'Embajador creado exitosamente',
      data: ambassadorResult
    }, { status: 201 });

  } catch (error) {
    console.error('Error in create-ambassador:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return jsonResponse({
      success: false,
      message: 'Error al crear embajador',
      error: errorMessage
    }, { status: 400 });
  }
});
