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
    const { ambassadorData } = await req.json()
    
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

    // Check for existing ambassador with same email or RUT
    const { data: existingAmbassador } = await supabase
      .from('embassadors')
      .select('id, email, rut')
      .eq('organization_id', userData.organization_id)
      .or(`email.eq.${ambassadorData.email},rut.eq.${ambassadorData.rut}`)
      .single()

    if (existingAmbassador) {
      throw new Error('Ya existe un embajador con ese email o RUT')
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
        organization_id: userData.organization_id,
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
      .single()

    if (ambassadorError) {
      throw new Error(`Error creating ambassador: ${ambassadorError.message}`)
    }

    // Create success feedback card
    await supabase.rpc('create_feedback_card', {
      p_user_id: userData.id,
      p_event_id: null,
      p_type: 'success',
      p_message: `Embajador "${ambassadorData.first_name} ${ambassadorData.last_name}" creado exitosamente. Estado: Pendiente de aprobación.`
    })

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
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Embajador creado exitosamente',
        data: ambassadorResult
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      }
    )

  } catch (error) {
    console.error('Error in create-ambassador:', error)
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error al crear embajador',
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})