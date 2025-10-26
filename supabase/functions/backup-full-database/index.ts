import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupData {
  timestamp: string;
  organizations: any[];
  embassadors: any[];
  fiestas: any[];
  events: any[];
  tasks: any[];
  leaderboards: any[];
  users: any[];
  organization_settings: any[];
  notifications: any[];
  import_logs: any[];
  task_logs: any[];
}

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

    console.log('Starting full database backup for user:', user.id);

    // Fetch all data from all tables
    const backupData: BackupData = {
      timestamp: new Date().toISOString(),
      organizations: [],
      embassadors: [],
      fiestas: [],
      events: [],
      tasks: [],
      leaderboards: [],
      users: [],
      organization_settings: [],
      notifications: [],
      import_logs: [],
      task_logs: []
    };

    // Fetch organizations (only user's own)
    const { data: organizations } = await supabaseClient
      .from('organizations')
      .select('*')
      .eq('created_by', user.id);
    backupData.organizations = organizations || [];

    if (organizations && organizations.length > 0) {
      const orgIds = organizations.map(org => org.id);

      // Fetch embassadors for user's organizations
      const { data: embassadors } = await supabaseClient
        .from('embassadors')
        .select('*')
        .in('organization_id', orgIds);
      backupData.embassadors = embassadors || [];

      // Fetch fiestas for user's organizations
      const { data: fiestas } = await supabaseClient
        .from('fiestas')
        .select('*')
        .in('organization_id', orgIds);
      backupData.fiestas = fiestas || [];

      if (fiestas && fiestas.length > 0) {
        const fiestaIds = fiestas.map(f => f.id);
        
        // Fetch events for user's fiestas
        const { data: events } = await supabaseClient
          .from('events')
          .select('*')
          .in('fiesta_id', fiestaIds);
        backupData.events = events || [];
      }

      if (embassadors && embassadors.length > 0) {
        const embassadorIds = embassadors.map(e => e.id);
        
        // Fetch tasks for user's embassadors
        const { data: tasks } = await supabaseClient
          .from('tasks')
          .select('*')
          .in('embassador_id', embassadorIds);
        backupData.tasks = tasks || [];

        if (tasks && tasks.length > 0) {
          const taskIds = tasks.map(t => t.id);
          
          // Fetch task logs
          const { data: taskLogs } = await supabaseClient
            .from('task_logs')
            .select('*')
            .in('task_id', taskIds);
          backupData.task_logs = taskLogs || [];
        }
      }

      if (backupData.events.length > 0) {
        const eventIds = backupData.events.map(e => e.id);
        
        // Fetch leaderboards for user's events
        const { data: leaderboards } = await supabaseClient
          .from('leaderboards')
          .select('*')
          .in('event_id', eventIds);
        backupData.leaderboards = leaderboards || [];
      }

      // Fetch organization settings
      const { data: orgSettings } = await supabaseClient
        .from('organization_settings')
        .select('*')
        .in('organization_id', orgIds);
      backupData.organization_settings = orgSettings || [];

      // Fetch notifications
      const { data: notifications } = await supabaseClient
        .from('notifications')
        .select('*')
        .in('organization_id', orgIds);
      backupData.notifications = notifications || [];
    }

    // Fetch user profile
    const { data: userProfile } = await supabaseClient
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id);
    backupData.users = userProfile || [];

    // Fetch import logs
    const { data: importLogs } = await supabaseClient
      .from('import_logs')
      .select('*')
      .eq('user_id', user.id);
    backupData.import_logs = importLogs || [];

// Sanitize sensitive fields before returning
backupData.organizations = (backupData.organizations || []).map((o: any) => {
  const { meta_token, token_expiry, ...safe } = o; return safe;
});
backupData.embassadors = (backupData.embassadors || []).map((a: any) => {
  const { instagram_access_token, token_expires_at, ...safe } = a; return safe;
});

console.log('Backup completed successfully. Data summary:', {
  organizations: backupData.organizations.length,
  embassadors: backupData.embassadors.length,
  fiestas: backupData.fiestas.length,
  events: backupData.events.length,
  tasks: backupData.tasks.length,
  leaderboards: backupData.leaderboards.length,
  users: backupData.users.length,
  organization_settings: backupData.organization_settings.length,
  notifications: backupData.notifications.length,
  import_logs: backupData.import_logs.length,
  task_logs: backupData.task_logs.length
});

return new Response(
  JSON.stringify(backupData),
  { 
    status: 200, 
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="eva-backup-${new Date().toISOString().split('T')[0]}.json"`
    } 
  }
);

  } catch (error) {
    console.error('Error during backup:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: 'Error creating backup', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});