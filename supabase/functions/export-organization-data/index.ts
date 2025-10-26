import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organizationId, format = 'json', tables = 'all' } = await req.json();

    console.log('Starting organization export:', { organizationId, format, tables });

    // Verify user owns this organization
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .eq('created_by', user.id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const exportData: Record<string, any> = {
      metadata: {
        organization_id: organizationId,
        organization_name: org.name,
        export_timestamp: new Date().toISOString(),
        export_format: format,
        exported_by: user.id
      }
    };

    // Define what tables to export
    const availableTables = ['embassadors', 'fiestas', 'events', 'tasks', 'leaderboards', 'organization_settings', 'notifications'];
    const tablesToExport = tables === 'all' ? availableTables : (Array.isArray(tables) ? tables : [tables]);

    // Export organization data
    exportData.organization = org;

    // Export embassadors
    if (tablesToExport.includes('embassadors')) {
      const { data: embassadors } = await supabaseClient
        .from('embassadors')
        .select('*')
        .eq('organization_id', organizationId);
      exportData.embassadors = embassadors || [];
    }

    // Export fiestas
    if (tablesToExport.includes('fiestas')) {
      const { data: fiestas } = await supabaseClient
        .from('fiestas')
        .select('*')
        .eq('organization_id', organizationId);
      exportData.fiestas = fiestas || [];

      // Export events for these fiestas
      if (tablesToExport.includes('events') && exportData.fiestas.length > 0) {
        const fiestaIds = exportData.fiestas.map((f: any) => f.id);
        const { data: events } = await supabaseClient
          .from('events')
          .select('*')
          .in('fiesta_id', fiestaIds);
        exportData.events = events || [];
      }
    }

    // Export tasks
    if (tablesToExport.includes('tasks') && exportData.embassadors?.length > 0) {
      const embassadorIds = exportData.embassadors.map((e: any) => e.id);
      const { data: tasks } = await supabaseClient
        .from('tasks')
        .select('*')
        .in('embassador_id', embassadorIds);
      exportData.tasks = tasks || [];
    }

    // Export leaderboards
    if (tablesToExport.includes('leaderboards') && exportData.events?.length > 0) {
      const eventIds = exportData.events.map((e: any) => e.id);
      const { data: leaderboards } = await supabaseClient
        .from('leaderboards')
        .select('*')
        .in('event_id', eventIds);
      exportData.leaderboards = leaderboards || [];
    }

    // Export organization settings
    if (tablesToExport.includes('organization_settings')) {
      const { data: settings } = await supabaseClient
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId);
      exportData.organization_settings = settings || [];
    }

// Export notifications
if (tablesToExport.includes('notifications')) {
  const { data: notifications } = await supabaseClient
    .from('notifications')
    .select('*')
    .eq('organization_id', organizationId);
  exportData.notifications = notifications || [];
}

// Sanitize sensitive fields before packaging
if (exportData.organization) {
  const { meta_token, token_expiry, ...safeOrg } = exportData.organization as any;
  exportData.organization = safeOrg;
}
if (Array.isArray(exportData.embassadors)) {
  exportData.embassadors = exportData.embassadors.map((a: any) => {
    const { instagram_access_token, token_expires_at, ...safe } = a; return safe;
  });
}

    // Log the export operation
    await supabaseClient
      .from('import_logs')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        type: 'export',
        source: 'api',
        file_name: `export-${org.name}-${new Date().toISOString().split('T')[0]}`,
        status: 'completed',
        result_json: {
          tables_exported: tablesToExport,
          record_counts: Object.keys(exportData).reduce((acc, key) => {
            if (Array.isArray(exportData[key])) {
              acc[key] = exportData[key].length;
            }
            return acc;
          }, {} as Record<string, number>),
          timestamp: new Date().toISOString()
        }
      });

    let responseContent: string;
    let contentType: string;
    let fileName: string;

    if (format === 'csv') {
      // Convert to CSV format (simplified, only embassadors table)
      const csvData = exportData.embassadors || [];
      if (csvData.length > 0) {
        const headers = Object.keys(csvData[0]).join(',');
        const rows = csvData.map((row: any) => 
          Object.values(row).map(val => 
            typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
          ).join(',')
        );
        responseContent = [headers, ...rows].join('\n');
      } else {
        responseContent = '';
      }
      contentType = 'text/csv';
      fileName = `eva-export-${org.name}-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      // JSON format
      responseContent = JSON.stringify(exportData, null, 2);
      contentType = 'application/json';
      fileName = `eva-export-${org.name}-${new Date().toISOString().split('T')[0]}.json`;
    }

    console.log('Export completed successfully for organization:', organizationId);

    return new Response(
      responseContent,
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`
        } 
      }
    );

  } catch (error) {
    console.error('Error during export:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: 'Error exporting data', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});