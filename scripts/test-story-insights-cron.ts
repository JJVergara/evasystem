import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

function loadEnvFile() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectRoot = join(__dirname, '..');
    const envPath = join(projectRoot, '.env');

    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch {
    // .env no existe o no se puede leer, continuar sin él
  }
}

loadEnvFile();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://awpfslcepylnipaolmvv.supabase.co';
const FUNCTION_NAME = 'collect-story-insights';

function checkEnv() {
  const required = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    process.exit(1);
  }
}

async function testManualUser() {
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!anonKey) {
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({}),
    });

    await response.json();
    return response.ok;
  } catch {
    return false;
  }
}

async function testManualCron() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET;

  if (!serviceRoleKey || !cronSecret) {
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
        'x-cron-secret': cronSecret,
      },
      body: JSON.stringify({ source: 'cron' }),
    });

    await response.json();
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyCronJob() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return false;
  }

  try {
    const supabase = createClient(SUPABASE_URL, serviceRoleKey);

    const { error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT jobid, jobname, schedule, active
        FROM cron.job
        WHERE jobname = 'collect-story-insights-every-2h';
      `,
    });

    return !error;
  } catch {
    return false;
  }
}

async function verifyData() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return false;
  }

  try {
    const supabase = createClient(SUPABASE_URL, serviceRoleKey);

    const { error: snapshotsError } = await supabase
      .from('story_insights_snapshots')
      .select('id', { count: 'exact', head: true });

    const { error: storiesError } = await supabase
      .from('social_mentions')
      .select('id', { count: 'exact', head: true })
      .eq('mention_type', 'story')
      .gt('mentioned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { error: recentError } = await supabase
      .from('story_insights_snapshots')
      .select('id', { count: 'exact', head: true })
      .gt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    return !snapshotsError && !storiesError && !recentError;
  } catch {
    return false;
  }
}

async function main() {
  const command = process.argv[2] || 'help';

  switch (command) {
    case 'manual':
    case 'user':
      await testManualUser();
      break;

    case 'cron':
      checkEnv();
      await testManualCron();
      break;

    case 'verify':
      checkEnv();
      await verifyCronJob();
      break;

    case 'data':
      checkEnv();
      await verifyData();
      break;

    case 'all':
      checkEnv();
      await testManualCron();
      await verifyCronJob();
      await verifyData();
      break;

    case 'help':
    default:
      break;
  }
}

main().catch(() => {});
