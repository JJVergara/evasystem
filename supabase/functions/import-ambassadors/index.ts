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
    const { ambassadors, organizationId } = await req.json()
    
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

    // Validate organization access
    if (userData.organization_id !== organizationId) {
      throw new Error('No tienes permiso para importar embajadores a esta organización')
    }

    // Get existing ambassadors to check for duplicates
    const { data: existingAmbassadors } = await supabase
      .from('embassadors')
      .select('email, rut')
      .eq('organization_id', organizationId)

    const existingEmails = new Set(existingAmbassadors?.map(a => a.email) || [])
    const existingRuts = new Set(existingAmbassadors?.map(a => a.rut) || [])

  const results: {
    successful: number;
    failed: number;
    duplicates: number;
    errors: string[];
  } = {
    successful: 0,
    failed: 0,
    duplicates: 0,
    errors: []
  };

    const validAmbassadors = []

    for (const ambassador of ambassadors) {
      // Check for duplicates
      if (existingEmails.has(ambassador.email) || existingRuts.has(ambassador.rut)) {
        results.duplicates++
        results.errors.push(`Duplicado: ${ambassador.first_name} ${ambassador.last_name} (${ambassador.email})`)
        continue
      }

      // Validate required fields
      if (!ambassador.first_name || !ambassador.last_name || !ambassador.email || !ambassador.rut) {
        results.failed++
        results.errors.push(`Campos requeridos faltantes: ${ambassador.first_name} ${ambassador.last_name}`)
        continue
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
        failed_tasks: 0
      })

      // Add to existing sets to prevent duplicates within the same import
      existingEmails.add(ambassador.email)
      existingRuts.add(ambassador.rut)
    }

    // Bulk insert valid ambassadors
    if (validAmbassadors.length > 0) {
      const { data: insertResult, error: insertError } = await supabase
        .from('embassadors')
        .insert(validAmbassadors)
        .select()

      if (insertError) {
        throw new Error(`Error en importación masiva: ${insertError.message}`)
      }

      results.successful = insertResult.length
    }

    // Create import log
    await supabase
      .from('import_logs')
      .insert({
        user_id: userData.id,
        organization_id: organizationId,
        type: 'embassadors',
        source: 'manual_import',
        file_name: 'bulk_import.json',
        status: 'completed',
        result_json: results
      })

    // Create feedback card
    await supabase.rpc('create_feedback_card', {
      p_user_id: userData.id,
      p_event_id: null,
      p_type: results.failed > 0 ? 'warning' : 'success',
      p_message: `Importación completada: ${results.successful} exitosos, ${results.failed} fallidos, ${results.duplicates} duplicados`
    })

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
        import_timestamp: new Date().toISOString()
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Importación de embajadores completada',
        data: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in import-ambassadors:', error)
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error en importación de embajadores',
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})