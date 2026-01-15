/**
 * Handle User Registration Edge Function
 * Handles new user registration and organization creation
 */

import { corsPreflightResponse, jsonResponse, errorResponse } from '../shared/responses.ts';
import { createSupabaseClient } from '../shared/auth.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const {
      email,
      password,
      name,
      organizationName,
      organizationDescription,
      mainInstagramAccount,
      authUserId
    } = await req.json();

    // Initialize Supabase client with service role
    const supabase = createSupabaseClient();

    let userData;
    let authData;

    // Si viene authUserId, es un usuario existente creando una organización
    if (authUserId) {
      // Verificar si el usuario ya existe en la tabla users
      const { data: existingUser, error: existingUserError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (existingUserError && existingUserError.code !== 'PGRST116') {
        throw new Error(`Error checking existing user: ${existingUserError.message}`);
      }

      authData = { user: { id: authUserId, email } };

      if (existingUser) {
        userData = existingUser;
      }
    } else {
      // Crear nuevo usuario en auth
      const { data: newAuthData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (authError) {
        throw new Error(`Error creating user: ${authError.message}`);
      }

      authData = newAuthData;
    }

    // Crear organización
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
        description: organizationDescription || `Organización de ${name}`,
        created_by: authData.user.id
      })
      .select()
      .single();

    if (orgError) {
      throw new Error(`Error creating organization: ${orgError.message}`);
    }

    // Si no hay userData, crear el registro del usuario
    if (!userData) {
      const { data: newUserData, error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          email,
          name,
          organization_id: orgData.id,
          role: 'user'
        })
        .select()
        .single();

      if (userError) {
        throw new Error(`Error creating user record: ${userError.message}`);
      }

      userData = newUserData;
    } else {
      // For existing users creating a new organization, add them as member
      // Don't update their primary organization_id, just add membership
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: authData.user.id,
          role: 'owner',
          status: 'active',
          permissions: {
            manage_ambassadors: true,
            manage_events: true,
            manage_instagram: true,
            view_analytics: true,
            manage_members: true
          }
        });

      if (memberError) {
        console.log('Membership may already exist:', memberError.message);
        // Don't throw error if membership already exists
      }

      // Update user's current organization to the new one
      const { data: updatedUserData, error: updateError } = await supabase
        .from('users')
        .update({
          organization_id: orgData.id
        })
        .eq('id', userData.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Error updating user record: ${updateError.message}`);
      }

      userData = updatedUserData;
    }

    // Create welcome feedback card
    await supabase.rpc('create_feedback_card', {
      p_user_id: userData.id,
      p_event_id: null,
      p_type: 'success',
      p_message: `¡Bienvenido a EVA System, ${name}! Tu organización ${organizationName} ha sido creada exitosamente.`
    });

    // Create registration log
    await supabase.rpc('create_event_log', {
      p_user_id: userData.id,
      p_event_id: null,
      p_action: authUserId ? 'organization_creation' : 'user_registration',
      p_details: {
        email,
        organization_name: organizationName,
        timestamp: new Date().toISOString()
      }
    });

    return jsonResponse({
      success: true,
      message: 'Organización creada exitosamente',
      data: {
        user: userData,
        organization: orgData
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in handle-user-registration:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return jsonResponse({
      success: false,
      message: 'Error al procesar solicitud',
      error: errorMessage
    }, { status: 400 });
  }
});
