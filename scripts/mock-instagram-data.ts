import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

function checkEnv() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    process.exit(1);
  }
  return serviceRoleKey;
}

async function getOrCreateTestUser(supabase: SupabaseClient): Promise<string | null> {
  const { data: existingUsers } = await supabase
    .from('users')
    .select('auth_user_id')
    .limit(1)
    .single();

  if (existingUsers?.auth_user_id) {
    return existingUsers.auth_user_id;
  }

  try {
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    if (authUsers?.users && authUsers.users.length > 0) {
      return authUsers.users[0].id;
    }
  } catch {
    // Si no podemos acceder a auth.users, continuamos sin usuario
  }

  return null;
}

async function createTestOrganization(supabase: SupabaseClient) {
  const orgName = `Test Organization ${Date.now()}`;
  const instagramBusinessAccountId = '17841405309217644';
  const instagramUsername = 'test_org_instagram';
  const instagramUserId = '17841405309217644';

  const userId = await getOrCreateTestUser(supabase);

  const { data: existing } = await supabase
    .from('organizations')
    .select('id, name, instagram_business_account_id')
    .eq('instagram_business_account_id', instagramBusinessAccountId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const orgData: {
    name: string;
    instagram_business_account_id: string;
    instagram_username: string;
    instagram_user_id: string;
    created_by?: string;
  } = {
    name: orgName,
    instagram_business_account_id: instagramBusinessAccountId,
    instagram_username: instagramUsername,
    instagram_user_id: instagramUserId,
  };

  if (userId) {
    orgData.created_by = userId;
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .insert(orgData)
    .select('id, name, instagram_business_account_id')
    .single();

  if (error) {
    if (error.message?.includes('organization_members') || error.message?.includes('user_id')) {
      throw new Error(
        'Se requiere un usuario para crear organizaciones. Usa una organización existente o crea un usuario primero.'
      );
    }
    throw error;
  }

  return org;
}

async function createTestToken(supabase: SupabaseClient, orgId: string) {
  const mockToken = `mock_instagram_token_${Date.now()}`;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 60);

  const { data: token, error } = await supabase
    .from('organization_instagram_tokens')
    .upsert(
      {
        organization_id: orgId,
        access_token: mockToken,
        token_expiry: expiryDate.toISOString(),
      },
      {
        onConflict: 'organization_id',
      }
    )
    .select('id, organization_id, token_expiry')
    .single();

  if (error) {
    throw error;
  }

  return token;
}

async function checkStoryReferralConstraint(
  supabase: SupabaseClient,
  orgId: string
): Promise<boolean> {
  try {
    const testStory = {
      organization_id: orgId,
      instagram_user_id: 'test_check',
      instagram_username: 'test_check',
      mention_type: 'story_referral',
      instagram_story_id: 'test_check_constraint',
      mentioned_at: new Date().toISOString(),
      state: 'new',
      platform: 'instagram',
    };

    const { error } = await supabase.from('social_mentions').insert(testStory);

    if (error) {
      if (
        error.message?.includes('mention_type_check') ||
        error.message?.includes('check constraint')
      ) {
        await supabase
          .from('social_mentions')
          .delete()
          .eq('instagram_story_id', 'test_check_constraint');
        return false;
      }
      return true;
    }

    await supabase
      .from('social_mentions')
      .delete()
      .eq('instagram_story_id', 'test_check_constraint');

    return true;
  } catch {
    return false;
  }
}

async function createTestStories(supabase: SupabaseClient, orgId: string) {
  const hasStoryReferral = await checkStoryReferralConstraint(supabase, orgId);

  if (!hasStoryReferral) {
    throw new Error(
      'El constraint de mention_type necesita incluir "story_referral". Ejecuta la migración correspondiente.'
    );
  }

  const now = new Date();
  const instagramUserId = '17841405309217644';

  const storyAges = [
    { hours: 1, username: 'test_user_1h' },
    { hours: 2, username: 'test_user_2h' },
    { hours: 4, username: 'test_user_4h' },
    { hours: 8, username: 'test_user_8h' },
    { hours: 12, username: 'test_user_12h' },
    { hours: 20, username: 'test_user_20h' },
    { hours: 23, username: 'test_user_23h' },
  ];

  const stories = storyAges.map(({ hours, username }) => {
    const mentionedAt = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const storyId = `mock_story_${hours}h_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    return {
      organization_id: orgId,
      instagram_user_id: instagramUserId,
      instagram_username: username,
      mention_type: 'story_referral',
      instagram_story_id: storyId,
      instagram_media_id: `mock_media_${hours}h_${Date.now()}`,
      mentioned_at: mentionedAt.toISOString(),
      state: 'new',
      platform: 'instagram',
      created_at: new Date().toISOString(),
    };
  });

  const { data: insertedStories, error } = await supabase
    .from('social_mentions')
    .insert(stories)
    .select('id, instagram_story_id, mentioned_at, state');

  if (error) {
    throw error;
  }

  return insertedStories;
}

async function createAll() {
  checkEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(SUPABASE_URL, serviceRoleKey);

  try {
    const org = await createTestOrganization(supabase);
    await createTestToken(supabase, org.id);
    await createTestStories(supabase, org.id);
  } catch {
    process.exit(1);
  }
}

async function createStoriesOnly() {
  checkEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(SUPABASE_URL, serviceRoleKey);

  const orgId = process.argv[3];
  if (!orgId) {
    process.exit(1);
  }

  try {
    await createTestStories(supabase, orgId);
  } catch {
    process.exit(1);
  }
}

async function listOrganizations() {
  checkEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(SUPABASE_URL, serviceRoleKey);

  try {
    await supabase
      .from('organizations')
      .select('id, name, instagram_business_account_id, instagram_username, created_at')
      .not('instagram_business_account_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
  } catch {
    // Error listing organizations
  }
}

async function verifyData() {
  checkEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(SUPABASE_URL, serviceRoleKey);

  try {
    await supabase
      .from('social_mentions')
      .select('id, instagram_story_id, mentioned_at, state, mention_type')
      .like('instagram_story_id', 'mock_story_%')
      .order('mentioned_at', { ascending: false });

    await supabase
      .from('story_insights_snapshots')
      .select('id, instagram_story_id, snapshot_at, story_age_hours, impressions, reach')
      .like('instagram_story_id', 'mock_story_%')
      .order('snapshot_at', { ascending: false });
  } catch {
    // Error verifying data
  }
}

async function cleanup() {
  checkEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(SUPABASE_URL, serviceRoleKey);

  try {
    const { data: stories } = await supabase
      .from('social_mentions')
      .select('id')
      .like('instagram_story_id', 'mock_story_%');

    if (stories && stories.length > 0) {
      const storyIds = stories.map((s) => s.id);
      await supabase.from('social_mentions').delete().in('id', storyIds);
    }
  } catch {
    // Error during cleanup
  }
}

async function main() {
  const command = process.argv[2] || 'help';

  switch (command) {
    case 'create':
      await createAll();
      break;

    case 'stories':
      await createStoriesOnly();
      break;

    case 'list':
      await listOrganizations();
      break;

    case 'verify':
      await verifyData();
      break;

    case 'cleanup':
      await cleanup();
      break;

    case 'help':
    default:
      break;
  }
}

main().catch(() => {});
