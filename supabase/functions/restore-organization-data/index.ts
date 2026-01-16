import { corsPreflightResponse, jsonResponse, errorResponse } from '../shared/responses.ts';
import { authenticateRequest } from '../shared/auth.ts';

interface RestoreResults {
  success: boolean;
  restored: Record<string, number>;
  errors: string[];
  summary: string;
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

    const { backupData, options } = await req.json();
    const { overwriteExisting = false, selectiveTables = [] } = options || {};

    void ('Starting data restoration for user:', user.id);
    void ('Restore options:', { overwriteExisting, selectiveTables });

    const results: RestoreResults = {
      success: true,
      restored: {},
      errors: [],
      summary: '',
    };

    const restoreTable = async (
      tableName: string,
      data: Record<string, unknown>[],
      foreignKeyMap?: Record<string, string>
    ): Promise<number> => {
      if (!data || data.length === 0) return 0;

      try {
        let processedData = data;
        if (foreignKeyMap) {
          processedData = data.map((item) => {
            const mappedItem = { ...item };
            Object.entries(foreignKeyMap).forEach(([oldKey, newKey]) => {
              if (mappedItem[oldKey]) {
                mappedItem[newKey] = mappedItem[oldKey];
                delete mappedItem[oldKey];
              }
            });
            return mappedItem;
          });
        }

        const { data: userOrgs } = await supabaseClient
          .from('organizations')
          .select('id')
          .eq('created_by', user.id);
        const allowedOrgIds = new Set((userOrgs || []).map((o: { id: string }) => o.id));

        if (tableName === 'organizations') {
          processedData = processedData.map((org) => {
            const { meta_token: _meta_token, token_expiry: _token_expiry, created_by: _created_by, ...rest } = org;
            return { ...rest, created_by: user.id };
          });
        } else if (tableName === 'users') {
          processedData = processedData.map((u) => {
            const { role: _role, auth_user_id: _auth_user_id, ...rest } = u;
            return { ...rest, auth_user_id: user.id };
          });
        } else {
          if (processedData[0] && 'organization_id' in processedData[0]) {
            processedData = processedData
              .filter((row) => allowedOrgIds.has(row.organization_id as string))
              .map((row) => {
                const sanitized = { ...row };
                if ('instagram_access_token' in sanitized) delete sanitized.instagram_access_token;
                if ('token_expires_at' in sanitized) delete sanitized.token_expires_at;
                return sanitized;
              });
          }
        }

        if (processedData.length === 0) return 0;

        if (overwriteExisting) {
          if (tableName === 'organizations') {
            const orgIds = processedData.map((org) => org.id as string);
            await supabaseClient
              .from(tableName)
              .delete()
              .in('id', orgIds)
              .eq('created_by', user.id);
          } else if (tableName === 'users') {
            await supabaseClient.from(tableName).delete().eq('auth_user_id', user.id);
          } else if (processedData[0] && 'organization_id' in processedData[0]) {
            await supabaseClient
              .from(tableName)
              .delete()
              .in('organization_id', Array.from(allowedOrgIds));
          }
        }

        const { data: insertedData, error } = await supabaseClient
          .from(tableName)
          .insert(processedData)
          .select();

        if (error) {
          throw error;
        }

        return insertedData?.length || 0;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Error restoring ${tableName}: ${errorMessage}`);
        return 0;
      }
    };

    const restoreOrder = [
      'organizations',
      'users',
      'organization_settings',
      'fiestas',
      'events',
      'embassadors',
      'tasks',
      'leaderboards',
      'notifications',
      'task_logs',
      'import_logs',
    ];

    for (const tableName of restoreOrder) {
      if (selectiveTables.length > 0 && !selectiveTables.includes(tableName)) {
        continue;
      }

      if (backupData[tableName]) {
        void (`Restoring ${tableName}...`);
        const restored = await restoreTable(tableName, backupData[tableName]);
        results.restored[tableName] = restored;
        void (`Restored ${restored} records in ${tableName}`);
      }
    }

    await supabaseClient.from('import_logs').insert({
      user_id: user.id,
      organization_id: backupData.organizations?.[0]?.id || null,
      type: 'restore',
      source: 'backup_file',
      file_name: `restore-${new Date().toISOString()}`,
      status: results.errors.length > 0 ? 'partial' : 'completed',
      result_json: {
        restored: results.restored,
        errors: results.errors,
        timestamp: new Date().toISOString(),
      },
    });

    results.summary = `Restoration completed. ${Object.values(results.restored).reduce((a, b) => a + b, 0)} total records restored.`;

    if (results.errors.length > 0) {
      results.success = false;
      results.summary += ` ${results.errors.length} errors occurred.`;
    }

    void ('Restoration completed:', results);

    return jsonResponse(results);
  } catch (error) {
    void ('Error during restoration:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(`Error restoring data: ${errorMessage}`, 500);
  }
});
