/**
 * Export Organization Data Edge Function
 * Exports organization data in JSON or CSV format
 */

import { corsHeaders } from '../shared/constants.ts';
import {
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  notFoundResponse,
} from '../shared/responses.ts';
import { authenticateRequest, verifyOrganizationAccess } from '../shared/auth.ts';

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
    const { user, supabase: supabaseClient } = authResult;

    // Parse request body
    const { organizationId, format = 'json', tables = 'all' } = await req.json();

    console.log('Starting organization export:', { organizationId, format, tables });

    // Verify user owns this organization
    const hasAccess = await verifyOrganizationAccess(supabaseClient, user.id, organizationId);
    if (!hasAccess) {
      return notFoundResponse('Organization not found or access denied');
    }

    // Get organization data
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return notFoundResponse('Organization not found');
    }

    const exportData: Record<string, unknown> = {
      metadata: {
        organization_id: organizationId,
        organization_name: org.name,
        export_timestamp: new Date().toISOString(),
        export_format: format,
        exported_by: user.id,
      },
    };

    // Define what tables to export
    const availableTables = [
      'embassadors',
      'fiestas',
      'events',
      'tasks',
      'leaderboards',
      'organization_settings',
      'notifications',
    ];
    const tablesToExport =
      tables === 'all' ? availableTables : Array.isArray(tables) ? tables : [tables];

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
      const fiestaList = exportData.fiestas as Array<{ id: string }>;
      if (tablesToExport.includes('events') && fiestaList.length > 0) {
        const fiestaIds = fiestaList.map((f) => f.id);
        const { data: events } = await supabaseClient
          .from('events')
          .select('*')
          .in('fiesta_id', fiestaIds);
        exportData.events = events || [];
      }
    }

    // Export tasks
    const embassadorList = exportData.embassadors as Array<{ id: string }> | undefined;
    if (tablesToExport.includes('tasks') && embassadorList?.length) {
      const embassadorIds = embassadorList.map((e) => e.id);
      const { data: tasks } = await supabaseClient
        .from('tasks')
        .select('*')
        .in('embassador_id', embassadorIds);
      exportData.tasks = tasks || [];
    }

    // Export leaderboards
    const eventList = exportData.events as Array<{ id: string }> | undefined;
    if (tablesToExport.includes('leaderboards') && eventList?.length) {
      const eventIds = eventList.map((e) => e.id);
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
      const { meta_token, token_expiry, ...safeOrg } = exportData.organization as Record<
        string,
        unknown
      >;
      exportData.organization = safeOrg;
    }
    if (Array.isArray(exportData.embassadors)) {
      exportData.embassadors = exportData.embassadors.map((a: Record<string, unknown>) => {
        const { instagram_access_token, token_expires_at, ...safe } = a;
        return safe;
      });
    }

    // Log the export operation
    await supabaseClient.from('import_logs').insert({
      user_id: user.id,
      organization_id: organizationId,
      type: 'export',
      source: 'api',
      file_name: `export-${org.name}-${new Date().toISOString().split('T')[0]}`,
      status: 'completed',
      result_json: {
        tables_exported: tablesToExport,
        record_counts: Object.keys(exportData).reduce(
          (acc, key) => {
            if (Array.isArray(exportData[key])) {
              acc[key] = (exportData[key] as unknown[]).length;
            }
            return acc;
          },
          {} as Record<string, number>
        ),
        timestamp: new Date().toISOString(),
      },
    });

    let responseContent: string;
    let contentType: string;
    let fileName: string;

    if (format === 'csv') {
      // Convert to CSV format (simplified, only embassadors table)
      const csvData = (exportData.embassadors || []) as Record<string, unknown>[];
      if (csvData.length > 0) {
        const headers = Object.keys(csvData[0]).join(',');
        const rows = csvData.map((row) =>
          Object.values(row)
            .map((val) => (typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val))
            .join(',')
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

    return new Response(responseContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error during export:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(`Error exporting data: ${errorMessage}`, 500);
  }
});
