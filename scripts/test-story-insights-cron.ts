/**
 * Script de Testing para Story Insights Cron Service
 * Uso: npx tsx scripts/test-story-insights-cron.ts [comando]
 * 
 * Comandos:
 *   - manual: Prueba como usuario autenticado
 *   - cron: Prueba simulando cron job
 *   - verify: Verifica configuración del cron
 *   - data: Verifica datos en la base de datos
 *   - all: Ejecuta todas las pruebas
 */

import { createClient } from '@supabase/supabase-js';
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

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://awpfslcepylnipaolmvv.supabase.co';
const FUNCTION_NAME = 'collect-story-insights';

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
  const required = {
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'CRON_SECRET': process.env.CRON_SECRET,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    log(`❌ Variables de entorno faltantes: ${missing.join(', ')}`, 'red');
    log('', 'reset');
    log('Opciones:', 'yellow');
    log('1. Agrega las variables a tu archivo .env en la raíz del proyecto:', 'yellow');
    log('   SUPABASE_SERVICE_ROLE_KEY=tu-key', 'blue');
    log('   CRON_SECRET=tu-secret', 'blue');
    log('', 'reset');
    log('2. O ejecuta: export VARIABLE_NAME="valor"', 'yellow');
    log('', 'reset');
    log('El script intentó cargar desde .env pero no encontró las variables.', 'blue');
    process.exit(1);
  }
}

// Prueba manual como usuario
async function testManualUser() {
  log('=== Prueba Manual (Como Usuario) ===', 'green');
  
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!anonKey) {
    log('❌ SUPABASE_ANON_KEY requerida para prueba de usuario', 'red');
    log('Obtén el token desde tu aplicación frontend después de autenticarte', 'yellow');
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    
    log(`Status: ${response.status}`, response.ok ? 'green' : 'red');
    log('Response:', 'blue');
    console.log(JSON.stringify(data, null, 2));

    if (response.ok) {
      log('✅ Prueba exitosa', 'green');
      return true;
    } else {
      log('❌ Prueba falló', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, 'red');
    return false;
  }
}

// Prueba manual como cron job
async function testManualCron() {
  log('=== Prueba Manual (Como Cron Job) ===', 'green');

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET;

  if (!serviceRoleKey || !cronSecret) {
    log('❌ SUPABASE_SERVICE_ROLE_KEY y CRON_SECRET requeridos', 'red');
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'x-cron-secret': cronSecret,
      },
      body: JSON.stringify({ source: 'cron' }),
    });

    const data = await response.json();
    
    log(`Status: ${response.status}`, response.ok ? 'green' : 'red');
    log('Response:', 'blue');
    console.log(JSON.stringify(data, null, 2));

    if (response.ok) {
      log('✅ Prueba exitosa', 'green');
      
      // Mostrar estadísticas si están disponibles
      if (data.summary) {
        log('\n📊 Estadísticas:', 'blue');
        console.log(`  Organizaciones procesadas: ${data.summary.organizationsProcessed || data.summary.totalOrganizationsProcessed || 'N/A'}`);
        console.log(`  Stories procesadas: ${data.summary.totalStoriesProcessed || 'N/A'}`);
        console.log(`  Snapshots creados: ${data.summary.totalSnapshotsCreated || 'N/A'}`);
        console.log(`  Errores: ${data.summary.totalErrors || 0}`);
      }

      return true;
    } else {
      log('❌ Prueba falló', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, 'red');
    return false;
  }
}

// Verificar configuración del cron job
async function verifyCronJob() {
  log('=== Verificación del Cron Job ===', 'green');

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    log('❌ SUPABASE_SERVICE_ROLE_KEY requerida', 'red');
    return false;
  }

  try {
    const supabase = createClient(SUPABASE_URL, serviceRoleKey);
    
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT jobid, jobname, schedule, active 
        FROM cron.job 
        WHERE jobname = 'collect-story-insights-every-2h';
      `
    });

    if (error) {
      log('⚠️  No se pudo verificar con RPC. Ejecuta manualmente en Supabase Dashboard:', 'yellow');
      log(`
        SELECT jobid, jobname, schedule, active 
        FROM cron.job 
        WHERE jobname = 'collect-story-insights-every-2h';
      `, 'blue');
      return false;
    }

    log('Cron Job Configurado:', 'blue');
    console.log(JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    log('⚠️  Ejecuta manualmente en Supabase Dashboard SQL Editor:', 'yellow');
    log(`
      SELECT jobid, jobname, schedule, active 
      FROM cron.job 
      WHERE jobname = 'collect-story-insights-every-2h';
    `, 'blue');
    return false;
  }
}

// Verificar datos en la base de datos
async function verifyData() {
  log('=== Verificación de Datos ===', 'green');

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    log('❌ SUPABASE_SERVICE_ROLE_KEY requerida', 'red');
    return false;
  }

  try {
    const supabase = createClient(SUPABASE_URL, serviceRoleKey);

    // Total snapshots
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('story_insights_snapshots')
      .select('id', { count: 'exact', head: true });

    // Active stories
    const { data: stories, error: storiesError } = await supabase
      .from('social_mentions')
      .select('id', { count: 'exact', head: true })
      .eq('mention_type', 'story')
      .gt('mentioned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Recent snapshots (last hour)
    const { data: recent, error: recentError } = await supabase
      .from('story_insights_snapshots')
      .select('id', { count: 'exact', head: true })
      .gt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    log('\n📊 Datos en Base de Datos:', 'blue');
    console.log(`  Total snapshots: ${snapshots?.length || 0}`);
    console.log(`  Stories activas (<24h): ${stories?.length || 0}`);
    console.log(`  Snapshots recientes (<1h): ${recent?.length || 0}`);

    if (snapshotsError || storiesError || recentError) {
      log('⚠️  Algunas consultas fallaron. Verifica permisos RLS.', 'yellow');
      return false;
    }

    return true;
  } catch (error) {
    log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, 'red');
    return false;
  }
}

// Ver logs (requiere Supabase CLI)
async function viewLogs() {
  log('=== Ver Logs Recientes ===', 'green');
  log('⚠️  Esta función requiere Supabase CLI', 'yellow');
  log('Ejecuta: supabase functions logs collect-story-insights --limit 20', 'blue');
  log('O ve a: Supabase Dashboard → Edge Functions → collect-story-insights → Logs', 'blue');
}

// Menú principal
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
    
    case 'logs':
      await viewLogs();
      break;
    
    case 'all':
      checkEnv();
      log('\n=== Ejecutando Todas las Pruebas ===\n', 'green');
      await testManualCron();
      console.log('');
      await verifyCronJob();
      console.log('');
      await verifyData();
      break;
    
    case 'help':
    default:
      log('Uso: npx tsx scripts/test-story-insights-cron.ts [comando]', 'blue');
      log('\nComandos disponibles:', 'blue');
      log('  manual, user   - Prueba manual como usuario autenticado', 'yellow');
      log('  cron           - Prueba manual simulando cron job', 'yellow');
      log('  verify         - Verificar configuración del cron job', 'yellow');
      log('  logs           - Ver logs recientes de la función', 'yellow');
      log('  data           - Verificar datos en la base de datos', 'yellow');
      log('  all            - Ejecutar todas las pruebas', 'yellow');
      log('\nVariables de entorno requeridas:', 'blue');
      log('  SUPABASE_SERVICE_ROLE_KEY - Para pruebas de cron', 'yellow');
      log('  SUPABASE_ANON_KEY         - Para pruebas de usuario', 'yellow');
      log('  CRON_SECRET               - Para autenticación de cron', 'yellow');
      log('\nEjemplo:', 'blue');
      log('  export SUPABASE_SERVICE_ROLE_KEY="tu-key"', 'yellow');
      log('  export CRON_SECRET="tu-secret"', 'yellow');
      log('  npx tsx scripts/test-story-insights-cron.ts cron', 'yellow');
      break;
  }
}

main().catch(console.error);
