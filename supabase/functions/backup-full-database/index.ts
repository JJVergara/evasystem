import { corsHeaders } from '../shared/constants.ts';
import {
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
} from '../shared/responses.ts';
import { authenticateRequest } from '../shared/auth.ts';

interface BackupData {
  timestamp: string;
  organizations: Record<string, unknown>[];
  embassadors: Record<string, unknown>[];
  fiestas: Record<string, unknown>[];
  events: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  leaderboards: Record<string, unknown>[];
  users: Record<string, unknown>[];
  organization_settings: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  import_logs: Record<string, unknown>[];
  task_logs: Record<string, unknown>[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const authResult = await authenticateRequest(req, { requireAuth: true });
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user, supabase: supabaseClient } = authResult;

    console.log('Starting full database backup for user:', user.id);

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
      task_logs: [],
    };

    const { data: organizations } = await supabaseClient
      .from('organizations')
      .select('*')
      .eq('created_by', user.id);
    backupData.organizations = organizations || [];

    if (organizations && organizations.length > 0) {
      const orgIds = organizations.map((org) => org.id);

      const { data: embassadors } = await supabaseClient
        .from('embassadors')
        .select('*')
        .in('organization_id', orgIds);
      backupData.embassadors = embassadors || [];

      const { data: fiestas } = await supabaseClient
        .from('fiestas')
        .select('*')
        .in('organization_id', orgIds);
      backupData.fiestas = fiestas || [];

      if (fiestas && fiestas.length > 0) {
        const fiestaIds = fiestas.map((f) => f.id);

        const { data: events } = await supabaseClient
          .from('events')
          .select('*')
          .in('fiesta_id', fiestaIds);
        backupData.events = events || [];
      }

      if (embassadors && embassadors.length > 0) {
        const embassadorIds = embassadors.map((e) => e.id);

        const { data: tasks } = await supabaseClient
          .from('tasks')
          .select('*')
          .in('embassador_id', embassadorIds);
        backupData.tasks = tasks || [];

        if (tasks && tasks.length > 0) {
          const taskIds = tasks.map((t) => t.id);

          const { data: taskLogs } = await supabaseClient
            .from('task_logs')
            .select('*')
            .in('task_id', taskIds);
          backupData.task_logs = taskLogs || [];
        }
      }

      if (backupData.events.length > 0) {
        const eventIds = backupData.events.map((e) => (e as { id: string }).id);

        const { data: leaderboards } = await supabaseClient
          .from('leaderboards')
          .select('*')
          .in('event_id', eventIds);
        backupData.leaderboards = leaderboards || [];
      }

      const { data: orgSettings } = await supabaseClient
        .from('organization_settings')
        .select('*')
        .in('organization_id', orgIds);
      backupData.organization_settings = orgSettings || [];

      const { data: notifications } = await supabaseClient
        .from('notifications')
        .select('*')
        .in('organization_id', orgIds);
      backupData.notifications = notifications || [];
    }

    const { data: userProfile } = await supabaseClient
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id);
    backupData.users = userProfile || [];

    const { data: importLogs } = await supabaseClient
      .from('import_logs')
      .select('*')
      .eq('user_id', user.id);
    backupData.import_logs = importLogs || [];

    backupData.organizations = (backupData.organizations || []).map((o) => {
      const { meta_token, token_expiry, ...safe } = o as Record<string, unknown>;
      return safe;
    });
    backupData.embassadors = (backupData.embassadors || []).map((a) => {
      const { instagram_access_token, token_expires_at, ...safe } = a as Record<string, unknown>;
      return safe;
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
      task_logs: backupData.task_logs.length,
    });

    return new Response(JSON.stringify(backupData), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="eva-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Error during backup:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(`Error creating backup: ${errorMessage}`, 500);
  }
});
