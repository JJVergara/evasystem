import {
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  badRequestResponse,
} from '../shared/responses.ts';
import { authenticateRequest, getUserOrganization } from '../shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const authResult = await authenticateRequest(req, { requireAuth: true });
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user, supabase } = authResult;

    const { eventData } = await req.json();
    if (!eventData) {
      return badRequestResponse('Event data is required');
    }

    const organizationId = await getUserOrganization(supabase, user.id);
    if (!organizationId) {
      return errorResponse('User has no organization', 400);
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (userDataError || !userData) {
      return errorResponse('User record not found', 404);
    }

    const { data: eventResult, error: eventError } = await supabase
      .from('events')
      .insert({
        name: eventData.name,
        description: eventData.description,
        event_date: eventData.event_date,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        location: eventData.location,
        event_type: eventData.event_type || 'otro',
        client_name: eventData.client_name,
        objective: eventData.objective,
        budget_estimate: eventData.budget_estimate,
        main_hashtag: eventData.main_hashtag,
        instagram_account: eventData.instagram_account,
        organization_id: organizationId,
        active: true,
      })
      .select()
      .single();

    if (eventError) {
      return errorResponse(`Error creating event: ${eventError.message}`, 400);
    }

    await supabase.rpc('create_feedback_card', {
      p_user_id: userData.id,
      p_event_id: eventResult.id,
      p_type: 'success',
      p_message: `Evento "${eventData.name}" creado exitosamente`,
    });

    await supabase.rpc('create_event_log', {
      p_user_id: userData.id,
      p_event_id: eventResult.id,
      p_action: 'event_created',
      p_details: {
        event_name: eventData.name,
        event_type: eventData.event_type,
        hashtag: eventData.main_hashtag,
        created_timestamp: new Date().toISOString(),
      },
    });

    return jsonResponse(
      {
        success: true,
        message: 'Evento creado exitosamente',
        data: eventResult,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return jsonResponse(
      {
        success: false,
        message: 'Error al crear evento',
        error: errorMessage,
      },
      { status: 400 }
    );
  }
});
