/**
 * Script para crear datos mock de Instagram (usuarios/stories) para testing
 * Uso: npx tsx scripts/mock-instagram-data.ts [comando]
 * 
 * Comandos:
 *   - create: Crea organización, token y stories de prueba
 *   - stories: Solo crea stories de prueba (requiere org_id)
 *   - cleanup: Elimina datos de prueba
 *   - list: Lista organizaciones de prueba
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Cargar variables de entorno desde .env si existe
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
      // Ignorar comentarios y líneas vacías
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remover comillas si están presentes
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Solo establecer si no está ya definida (las variables de entorno tienen prioridad)
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch (error) {
    // .env no existe o no se puede leer, continuar sin él
  }
}

// Cargar .env al inicio
loadEnvFile();

// Log si se cargó .env (solo para debugging)
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // Variable encontrada, probablemente desde .env
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://awpfslcepylnipaolmvv.supabase.co';

// Colores para console
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Verificar variables de entorno
function checkEnv() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    log('❌ SUPABASE_SERVICE_ROLE_KEY requerida', 'red');
    log('', 'reset');
    log('Opciones:', 'yellow');
    log('1. Agrega SUPABASE_SERVICE_ROLE_KEY a tu archivo .env en la raíz del proyecto', 'yellow');
    log('2. O ejecuta: export SUPABASE_SERVICE_ROLE_KEY="tu-key"', 'yellow');
    log('', 'reset');
    log('El script intentó cargar desde .env pero no encontró la variable.', 'blue');
    process.exit(1);
  }
  return serviceRoleKey;
}

// Obtener o crear un usuario de prueba
async function getOrCreateTestUser(supabase: SupabaseClient): Promise<string | null> {
  // Intentar encontrar un usuario existente
  const { data: existingUsers } = await supabase
    .from('users')
    .select('auth_user_id')
    .limit(1)
    .single();
  
  if (existingUsers?.auth_user_id) {
    return existingUsers.auth_user_id;
  }
  
  // Si no hay usuarios, intentar obtener uno de auth.users directamente
  // Nota: Esto requiere permisos de service_role
  try {
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    if (authUsers?.users && authUsers.users.length > 0) {
      return authUsers.users[0].id;
    }
  } catch (error) {
    // Si no podemos acceder a auth.users, continuamos sin usuario
    log('⚠️  No se pudo acceder a auth.users. Creando organización sin usuario.', 'yellow');
  }
  
  return null;
}

// Crear organización de prueba
async function createTestOrganization(supabase: SupabaseClient) {
  log('=== Creando Organización de Prueba ===', 'green');
  
  const orgName = `Test Organization ${Date.now()}`;
  const instagramBusinessAccountId = '17841405309217644'; // Mock Instagram Business Account ID
  const instagramUsername = 'test_org_instagram';
  const instagramUserId = '17841405309217644';
  
  // Intentar obtener un usuario existente
  const userId = await getOrCreateTestUser(supabase);
  
  if (!userId) {
    log('⚠️  No se encontró usuario. Creando organización sin created_by...', 'yellow');
    log('   Esto puede fallar si hay triggers que requieren user_id.', 'yellow');
  }
  
  // Primero verificar si ya existe una organización con este Instagram Business Account ID
  const { data: existing } = await supabase
    .from('organizations')
    .select('id, name, instagram_business_account_id')
    .eq('instagram_business_account_id', instagramBusinessAccountId)
    .maybeSingle();
  
  if (existing) {
    log(`✅ Organización ya existe: ${existing.name} (${existing.id})`, 'green');
    return existing;
  }
  
  // Crear la organización
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
  
  // Solo agregar created_by si tenemos un userId
  if (userId) {
    orgData.created_by = userId;
  }
  
  const { data: org, error } = await supabase
    .from('organizations')
    .insert(orgData)
    .select('id, name, instagram_business_account_id')
    .single();
  
  if (error) {
    // Si el error es por el trigger de organization_members, intentar crear manualmente
    if (error.message?.includes('organization_members') || error.message?.includes('user_id')) {
      log('⚠️  Error por trigger de organization_members. Intentando workaround...', 'yellow');
      
      // Intentar crear la organización sin el trigger usando RPC o SQL directo
      // Por ahora, sugerimos usar un usuario existente
      log('💡 Solución: Necesitas un usuario existente para crear organizaciones.', 'blue');
      log('   Opciones:', 'blue');
      log('   1. Crea un usuario manualmente en Supabase Dashboard', 'yellow');
      log('   2. O usa una organización existente con: npx tsx scripts/mock-instagram-data.ts list', 'yellow');
      log('   3. Luego crea solo stories: npx tsx scripts/mock-instagram-data.ts stories <org_id>', 'yellow');
      throw new Error('Se requiere un usuario para crear organizaciones. Usa una organización existente o crea un usuario primero.');
    }
    
    log(`❌ Error creando organización: ${error.message}`, 'red');
    throw error;
  }
  
  // Si la organización se creó sin created_by, necesitamos crear el organization_members manualmente
  // Pero esto requiere un user_id válido, así que si no tenemos uno, no podemos hacerlo
  if (!userId && org) {
    log('⚠️  Organización creada sin usuario. Algunas funcionalidades pueden no funcionar.', 'yellow');
  }
  
  log(`✅ Organización creada: ${org.name} (${org.id})`, 'green');
  return org;
}

// Crear token de Instagram de prueba
async function createTestToken(
  supabase: SupabaseClient,
  orgId: string
) {
  log('=== Creando Token de Instagram de Prueba ===', 'green');
  
  // Token de prueba (plain text, será manejado por safeDecryptToken)
  const mockToken = `mock_instagram_token_${Date.now()}`;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 60); // 60 días desde ahora
  
  const { data: token, error } = await supabase
    .from('organization_instagram_tokens')
    .upsert({
      organization_id: orgId,
      access_token: mockToken, // Plain text para testing
      token_expiry: expiryDate.toISOString(),
    }, {
      onConflict: 'organization_id'
    })
    .select('id, organization_id, token_expiry')
    .single();
  
  if (error) {
    log(`❌ Error creando token: ${error.message}`, 'red');
    throw error;
  }
  
  log(`✅ Token creado para organización ${orgId}`, 'green');
  log(`   Expira: ${token.token_expiry}`, 'blue');
  return token;
}

// Verificar si el constraint incluye 'story_referral' intentando un insert de prueba
async function checkStoryReferralConstraint(supabase: SupabaseClient, orgId: string): Promise<boolean> {
  try {
    // Intentar insertar un registro de prueba con 'story_referral'
    // Si falla, el constraint no lo permite
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
    
    const { error } = await supabase
      .from('social_mentions')
      .insert(testStory);
    
    if (error) {
      // Si el error es por el constraint, no está permitido
      if (error.message?.includes('mention_type_check') || error.message?.includes('check constraint')) {
        // Limpiar el registro de prueba si se insertó (no debería)
        await supabase
          .from('social_mentions')
          .delete()
          .eq('instagram_story_id', 'test_check_constraint');
        return false;
      }
      // Otro tipo de error, asumimos que el constraint está bien
      return true;
    }
    
    // Si se insertó correctamente, limpiar y retornar true
    await supabase
      .from('social_mentions')
      .delete()
      .eq('instagram_story_id', 'test_check_constraint');
    
    return true;
  } catch {
    // Si falla, asumimos que necesita actualizarse
    return false;
  }
}

// Crear stories de prueba con diferentes edades
async function createTestStories(
  supabase: SupabaseClient,
  orgId: string
) {
  log('=== Creando Stories de Prueba ===', 'green');
  
  // Verificar si el constraint incluye 'story_referral'
  log('Verificando constraint de mention_type...', 'blue');
  const hasStoryReferral = await checkStoryReferralConstraint(supabase, orgId);
  
  if (!hasStoryReferral) {
    log('⚠️  El constraint de mention_type no incluye "story_referral".', 'yellow');
    log('', 'reset');
    log('💡 Solución:', 'blue');
    log('   1. Ejecuta la migración en Supabase Dashboard SQL Editor:', 'yellow');
    log('', 'reset');
    log('      ALTER TABLE public.social_mentions', 'blue');
    log('      DROP CONSTRAINT IF EXISTS social_mentions_mention_type_check;', 'blue');
    log('', 'reset');
    log('      ALTER TABLE public.social_mentions', 'blue');
    log('      ADD CONSTRAINT social_mentions_mention_type_check', 'blue');
    log("      CHECK (mention_type IN ('mention', 'tag', 'hashtag', 'story', 'comment', 'story_referral'));", 'blue');
    log('', 'reset');
    log('   2. O ejecuta la migración con Supabase CLI:', 'yellow');
    log('      supabase migration up', 'blue');
    log('', 'reset');
    log('   3. Luego ejecuta este script nuevamente.', 'yellow');
    log('', 'reset');
    log('   Nota: También hay una migración en:', 'blue');
    log('   supabase/migrations/20250101000000_add_story_referral_to_mention_type.sql', 'blue');
    throw new Error('El constraint de mention_type necesita incluir "story_referral". Ejecuta el SQL mostrado arriba.');
  }
  
  log('✅ Constraint verificado (incluye story_referral)', 'green');
  
  const now = new Date();
  const instagramUserId = '17841405309217644';
  
  // Crear stories con diferentes edades para probar el sistema de snapshots
  // Snapshots se toman a: 1h, 4h, 8h, 12h, 20h, 23h (con ventana de ±30min)
  
  const storyAges = [
    { hours: 1, username: 'test_user_1h', shouldSnapshot: true },
    { hours: 2, username: 'test_user_2h', shouldSnapshot: false }, // No debería crear snapshot
    { hours: 4, username: 'test_user_4h', shouldSnapshot: true },
    { hours: 8, username: 'test_user_8h', shouldSnapshot: true },
    { hours: 12, username: 'test_user_12h', shouldSnapshot: true },
    { hours: 20, username: 'test_user_20h', shouldSnapshot: true },
    { hours: 23, username: 'test_user_23h', shouldSnapshot: true },
  ];
  
  const stories = storyAges.map(({ hours, username, shouldSnapshot }) => {
    const mentionedAt = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const storyId = `mock_story_${hours}h_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
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
    log(`❌ Error creando stories: ${error.message}`, 'red');
    throw error;
  }
  
  log(`✅ ${insertedStories.length} stories creadas:`, 'green');
  insertedStories.forEach((story, idx) => {
    const age = storyAges[idx].hours;
    const shouldSnapshot = storyAges[idx].shouldSnapshot;
    const snapshotNote = shouldSnapshot ? '✓ debería crear snapshot' : '✗ no debería crear snapshot';
    log(`   ${age}h - ${story.instagram_story_id} (${snapshotNote})`, 'blue');
  });
  
  return insertedStories;
}

// Crear todo (organización, token, stories)
async function createAll() {
  checkEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(SUPABASE_URL, serviceRoleKey);
  
  try {
    // 1. Crear organización
    const org = await createTestOrganization(supabase);
    console.log('');
    
    // 2. Crear token
    await createTestToken(supabase, org.id);
    console.log('');
    
    // 3. Crear stories
    await createTestStories(supabase, org.id);
    console.log('');
    
    log('=== Resumen ===', 'green');
    log(`✅ Organización: ${org.name} (${org.id})`, 'green');
    log(`✅ Token de Instagram creado`, 'green');
    log(`✅ 7 Stories de prueba creadas con diferentes edades`, 'green');
    log('', 'reset');
    log('Próximos pasos:', 'blue');
    log('1. Ejecuta: npx tsx scripts/test-story-insights-cron.ts cron', 'yellow');
    log('2. Verifica los snapshots en: story_insights_snapshots', 'yellow');
    log('3. Para limpiar: npx tsx scripts/mock-instagram-data.ts cleanup', 'yellow');
    
  } catch (error) {
    log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, 'red');
    process.exit(1);
  }
}

// Solo crear stories (requiere org_id)
async function createStoriesOnly() {
  checkEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(SUPABASE_URL, serviceRoleKey);
  
  const orgId = process.argv[3];
  if (!orgId) {
    log('❌ Se requiere organization_id', 'red');
    log('Uso: npx tsx scripts/mock-instagram-data.ts stories <org_id>', 'yellow');
    log('Obtén el ID con: npx tsx scripts/mock-instagram-data.ts list', 'yellow');
    process.exit(1);
  }
  
  try {
    await createTestStories(supabase, orgId);
  } catch (error) {
    log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, 'red');
    process.exit(1);
  }
}

// Listar organizaciones de prueba
async function listOrganizations() {
  checkEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(SUPABASE_URL, serviceRoleKey);
  
  try {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id, name, instagram_business_account_id, instagram_username, created_at')
      .not('instagram_business_account_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      log(`❌ Error: ${error.message}`, 'red');
      return;
    }
    
    if (!orgs || orgs.length === 0) {
      log('No se encontraron organizaciones con Instagram configurado', 'yellow');
      return;
    }
    
    log('=== Organizaciones con Instagram ===', 'green');
    orgs.forEach((org, idx) => {
      log(`\n${idx + 1}. ${org.name}`, 'blue');
      log(`   ID: ${org.id}`, 'yellow');
      log(`   Instagram Business Account: ${org.instagram_business_account_id}`, 'yellow');
      log(`   Username: ${org.instagram_username || 'N/A'}`, 'yellow');
    });
    
  } catch (error) {
    log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, 'red');
  }
}

// Verificar datos creados
async function verifyData() {
  checkEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(SUPABASE_URL, serviceRoleKey);
  
  log('=== Verificación de Datos Mock ===', 'green');
  
  try {
    // Buscar stories mock
    const { data: stories, error: storiesError } = await supabase
      .from('social_mentions')
      .select('id, instagram_story_id, mentioned_at, state, mention_type')
      .like('instagram_story_id', 'mock_story_%')
      .order('mentioned_at', { ascending: false });
    
    if (storiesError) {
      log(`❌ Error consultando stories: ${storiesError.message}`, 'red');
      return;
    }
    
    log(`\n📊 Stories Mock Encontradas: ${stories?.length || 0}`, 'blue');
    
    if (stories && stories.length > 0) {
      stories.forEach((story, idx) => {
        const age = Math.round((Date.now() - new Date(story.mentioned_at).getTime()) / (1000 * 60 * 60));
        log(`\n${idx + 1}. ${story.instagram_story_id}`, 'yellow');
        log(`   Edad: ~${age}h`, 'blue');
        log(`   Estado: ${story.state}`, 'blue');
        log(`   Tipo: ${story.mention_type}`, 'blue');
      });
    } else {
      log('No se encontraron stories mock', 'yellow');
    }
    
    // Buscar snapshots (probablemente no habrá ninguno porque los tokens son mock)
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('story_insights_snapshots')
      .select('id, instagram_story_id, snapshot_at, story_age_hours, impressions, reach')
      .like('instagram_story_id', 'mock_story_%')
      .order('snapshot_at', { ascending: false });
    
    if (!snapshotsError && snapshots) {
      log(`\n📸 Snapshots Creados: ${snapshots.length}`, 'blue');
      if (snapshots.length > 0) {
        snapshots.forEach((snapshot, idx) => {
          log(`\n${idx + 1}. Story: ${snapshot.instagram_story_id}`, 'yellow');
          log(`   Edad al snapshot: ${snapshot.story_age_hours}h`, 'blue');
          log(`   Impressions: ${snapshot.impressions}, Reach: ${snapshot.reach}`, 'blue');
        });
      } else {
        log('   (No hay snapshots - esto es normal con tokens mock)', 'yellow');
        log('   Los snapshots solo se crean cuando la API de Instagram devuelve datos válidos.', 'yellow');
      }
    }
    
    log('\n💡 Nota sobre los errores de token:', 'blue');
    log('   Los errores "Invalid OAuth access token" son ESPERADOS.', 'yellow');
    log('   Esto significa que:', 'yellow');
    log('   ✅ Las stories fueron encontradas por el cron', 'green');
    log('   ✅ El cron intentó obtener insights (falló con token mock)', 'yellow');
    log('   ✅ Para obtener insights reales, necesitas tokens reales de Instagram', 'blue');
    
  } catch (error) {
    log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, 'red');
  }
}

// Limpiar datos de prueba
async function cleanup() {
  checkEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(SUPABASE_URL, serviceRoleKey);
  
  log('=== Limpiando Datos de Prueba ===', 'green');
  
  try {
    // Eliminar stories de prueba (las que empiezan con "mock_story_")
    const { data: stories, error: storiesError } = await supabase
      .from('social_mentions')
      .select('id')
      .like('instagram_story_id', 'mock_story_%');
    
    if (stories && stories.length > 0) {
      const storyIds = stories.map(s => s.id);
      const { error: deleteStoriesError } = await supabase
        .from('social_mentions')
        .delete()
        .in('id', storyIds);
      
      if (deleteStoriesError) {
        log(`⚠️  Error eliminando stories: ${deleteStoriesError.message}`, 'yellow');
      } else {
        log(`✅ ${stories.length} stories eliminadas`, 'green');
      }
    } else {
      log('No se encontraron stories de prueba', 'yellow');
    }
    
    // Eliminar tokens de prueba (los que empiezan con "mock_instagram_token_")
    // Nota: No podemos filtrar por access_token directamente por RLS, así que eliminamos todos los tokens
    // de organizaciones de prueba. Mejor hacerlo manualmente o por organización específica.
    
    log('\n⚠️  Para eliminar tokens y organizaciones de prueba, hazlo manualmente:', 'yellow');
    log('   DELETE FROM organization_instagram_tokens WHERE organization_id = \'<org_id>\';', 'blue');
    log('   DELETE FROM organizations WHERE id = \'<org_id>\';', 'blue');
    
  } catch (error) {
    log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, 'red');
  }
}

// Menú principal
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
      log('Uso: npx tsx scripts/mock-instagram-data.ts [comando]', 'blue');
      log('\nComandos disponibles:', 'blue');
      log('  create   - Crea organización, token y stories de prueba', 'yellow');
      log('  stories  - Solo crea stories de prueba (requiere org_id como argumento)', 'yellow');
      log('  list     - Lista organizaciones con Instagram configurado', 'yellow');
      log('  verify   - Verifica datos mock creados (stories y snapshots)', 'yellow');
      log('  cleanup  - Elimina datos de prueba (stories mock)', 'yellow');
      log('\nVariables de entorno requeridas:', 'blue');
      log('  SUPABASE_SERVICE_ROLE_KEY - Para insertar datos', 'yellow');
      log('\nEjemplos:', 'blue');
      log('  # Crear todo desde cero', 'yellow');
      log('  npx tsx scripts/mock-instagram-data.ts create', 'yellow');
      log('', 'reset');
      log('  # Solo crear stories para una organización existente', 'yellow');
      log('  npx tsx scripts/mock-instagram-data.ts stories <org_id>', 'yellow');
      log('', 'reset');
      log('  # Listar organizaciones', 'yellow');
      log('  npx tsx scripts/mock-instagram-data.ts list', 'yellow');
      break;
  }
}

main().catch(console.error);

