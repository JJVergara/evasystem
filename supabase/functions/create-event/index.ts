import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { eventData } = await req.json()
    
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Invalid authentication')
    }

    // Get user record
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userDataError) {
      throw new Error('User not found')
    }

    // Create event
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
        organization_id: userData.organization_id,
        active: true
      })
      .select()
      .single()

    if (eventError) {
      throw new Error(`Error creating event: ${eventError.message}`)
    }

    // Create success feedback card
    await supabase.rpc('create_feedback_card', {
      p_user_id: userData.id,
      p_event_id: eventResult.id,
      p_type: 'success',
      p_message: `Evento "${eventData.name}" creado exitosamente`
    })

    // Create event log
    await supabase.rpc('create_event_log', {
      p_user_id: userData.id,
      p_event_id: eventResult.id,
      p_action: 'event_created',
      p_details: {
        event_name: eventData.name,
        event_type: eventData.event_type,
        hashtag: eventData.main_hashtag,
        created_timestamp: new Date().toISOString()
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Evento creado exitosamente',
        data: eventResult
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      }
    )

  } catch (error) {
    console.error('Error in create-event:', error)
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error al crear evento',
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})