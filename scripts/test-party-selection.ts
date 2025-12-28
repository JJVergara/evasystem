/**
 * Party Selection Feature Test Script
 *
 * This script tests the entire party selection flow:
 * - Auto-match when 1 active party
 * - Quick reply flow when 2+ active parties
 * - Response handling
 * - Timeout worker
 *
 * Usage:
 *   npx ts-node scripts/test-party-selection.ts
 *   # or with Deno:
 *   deno run --allow-net --allow-env scripts/test-party-selection.ts
 *
 * Environment variables needed:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for auth
 *   TEST_ORGANIZATION_ID - Organization ID to test with
 */

// Configuration - Update these for your environment
const CONFIG = {
  // Use local or production
  SUPABASE_URL: process.env.SUPABASE_URL || 'http://localhost:54321',
  SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key',

  // Test data - UPDATE THESE with real IDs from your database
  TEST_ORGANIZATION_ID: process.env.TEST_ORGANIZATION_ID || 'your-org-id',
  TEST_INSTAGRAM_BUSINESS_ACCOUNT_ID: 'your-instagram-business-account-id',
  TEST_FACEBOOK_PAGE_ID: 'your-facebook-page-id',

  // Simulated user (the person tagging you in stories)
  TEST_USER_INSTAGRAM_ID: 'test-user-' + Date.now(),
  TEST_USER_USERNAME: 'test_ambassador',
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message: string) {
  log(`✓ ${message}`, 'green');
}

function logError(message: string) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ ${message}`, 'blue');
}

// Helper to make API calls
async function callFunction(functionName: string, body: object): Promise<{ ok: boolean; data: any; status: number }> {
  const url = `${CONFIG.SUPABASE_URL}/functions/v1/${functionName}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    return { ok: false, data: { error: String(error) }, status: 0 };
  }
}

// Helper to query Supabase directly
async function querySupabase(table: string, query: string): Promise<any> {
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/${table}?${query}`;

  const response = await fetch(url, {
    headers: {
      'apikey': CONFIG.SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${CONFIG.SERVICE_ROLE_KEY}`,
    },
  });

  return response.json();
}

// Helper to insert/update Supabase
async function mutateSupabase(table: string, method: 'POST' | 'PATCH', body: object, query = ''): Promise<any> {
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;

  const response = await fetch(url, {
    method,
    headers: {
      'apikey': CONFIG.SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${CONFIG.SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });

  return response.json();
}

// ============================================================
// TEST PAYLOADS
// ============================================================

/**
 * Generate a story mention referral webhook payload
 * This simulates what Instagram sends when someone tags you in a story
 */
function generateStoryMentionPayload(overrides: Partial<{
  senderId: string;
  senderUsername: string;
  recipientId: string;
  storyId: string;
  timestamp: number;
}> = {}) {
  const timestamp = overrides.timestamp || Date.now();

  return {
    object: 'instagram',
    entry: [{
      id: overrides.recipientId || CONFIG.TEST_INSTAGRAM_BUSINESS_ACCOUNT_ID,
      time: timestamp,
      messaging: [{
        sender: {
          id: overrides.senderId || CONFIG.TEST_USER_INSTAGRAM_ID,
          username: overrides.senderUsername || CONFIG.TEST_USER_USERNAME,
        },
        recipient: {
          id: overrides.recipientId || CONFIG.TEST_INSTAGRAM_BUSINESS_ACCOUNT_ID,
        },
        timestamp: Math.floor(timestamp / 1000),
        referral: {
          source: 'SHORTLINK',
          type: 'STORY',
          ref: overrides.storyId || `story_${timestamp}`,
          referer_uri: `https://instagram.com/stories/${overrides.senderUsername || CONFIG.TEST_USER_USERNAME}/${overrides.storyId || timestamp}`,
        },
      }],
    }],
  };
}

/**
 * Generate a direct message webhook payload
 * This simulates what Instagram sends when someone sends a DM (party selection response)
 */
function generateMessagePayload(overrides: Partial<{
  senderId: string;
  senderUsername: string;
  recipientId: string;
  messageText: string;
  quickReplyPayload: string;
  timestamp: number;
}> = {}) {
  const timestamp = overrides.timestamp || Date.now();
  const messageId = `mid_${timestamp}`;

  const payload: any = {
    object: 'instagram',
    entry: [{
      id: overrides.recipientId || CONFIG.TEST_INSTAGRAM_BUSINESS_ACCOUNT_ID,
      time: timestamp,
      messaging: [{
        sender: {
          id: overrides.senderId || CONFIG.TEST_USER_INSTAGRAM_ID,
          username: overrides.senderUsername || CONFIG.TEST_USER_USERNAME,
        },
        recipient: {
          id: overrides.recipientId || CONFIG.TEST_INSTAGRAM_BUSINESS_ACCOUNT_ID,
        },
        timestamp: Math.floor(timestamp / 1000),
        mid: messageId,
        message: {
          mid: messageId,
          text: overrides.messageText || '1',
        },
      }],
    }],
  };

  // Add quick reply if provided
  if (overrides.quickReplyPayload) {
    payload.entry[0].messaging[0].message.quick_reply = {
      payload: overrides.quickReplyPayload,
    };
  }

  return payload;
}

// ============================================================
// TEST FUNCTIONS
// ============================================================

async function testGetActiveParties(): Promise<boolean> {
  logSection('Test 1: Get Active Parties');

  const parties = await querySupabase(
    'fiestas',
    `organization_id=eq.${CONFIG.TEST_ORGANIZATION_ID}&status=eq.active&select=id,name,status`
  );

  if (Array.isArray(parties)) {
    logInfo(`Found ${parties.length} active parties:`);
    parties.forEach((p: any) => console.log(`  - ${p.name} (${p.id})`));
    return true;
  } else {
    logError('Failed to fetch parties: ' + JSON.stringify(parties));
    return false;
  }
}

async function testSendPartySelection(mentionId: string): Promise<boolean> {
  logSection('Test 2: Send Party Selection Message');

  logInfo('Calling send-party-selection function...');

  const result = await callFunction('send-party-selection', {
    mentionId,
    organizationId: CONFIG.TEST_ORGANIZATION_ID,
    recipientInstagramUserId: CONFIG.TEST_USER_INSTAGRAM_ID,
  });

  console.log('Response:', JSON.stringify(result.data, null, 2));

  if (result.ok && result.data.success) {
    logSuccess('Party selection message sent!');
    return true;
  } else {
    logError('Failed to send party selection message');
    return false;
  }
}

async function testTimeoutWorker(): Promise<boolean> {
  logSection('Test 3: Timeout Worker');

  logInfo('Calling party-selection-timeout-worker...');

  const result = await callFunction('party-selection-timeout-worker', {
    source: 'test-script',
  });

  console.log('Response:', JSON.stringify(result.data, null, 2));

  if (result.ok) {
    logSuccess(`Timeout worker completed. Timed out: ${result.data.timedOutCount || 0} mentions`);
    return true;
  } else {
    logError('Timeout worker failed');
    return false;
  }
}

async function testWebhookStoryMention(): Promise<{ success: boolean; mentionId?: string }> {
  logSection('Test 4: Webhook - Story Mention');

  const payload = generateStoryMentionPayload();

  logInfo('Payload being sent:');
  console.log(JSON.stringify(payload, null, 2));

  logInfo('Calling instagram-webhook...');

  const result = await callFunction('instagram-webhook', payload);

  console.log('Response:', JSON.stringify(result.data, null, 2));

  if (result.ok) {
    logSuccess('Webhook processed successfully');

    // Find the created mention
    const mentions = await querySupabase(
      'social_mentions',
      `organization_id=eq.${CONFIG.TEST_ORGANIZATION_ID}&instagram_user_id=eq.${CONFIG.TEST_USER_INSTAGRAM_ID}&order=created_at.desc&limit=1`
    );

    if (mentions && mentions[0]) {
      logInfo(`Created mention ID: ${mentions[0].id}`);
      logInfo(`Party selection status: ${mentions[0].party_selection_status}`);
      logInfo(`Matched fiesta: ${mentions[0].matched_fiesta_id || 'none'}`);
      return { success: true, mentionId: mentions[0].id };
    }
  }

  logError('Webhook test failed');
  return { success: false };
}

async function testWebhookMessageResponse(quickReplyPayload?: string): Promise<boolean> {
  logSection('Test 5: Webhook - Message Response');

  const payload = generateMessagePayload({
    messageText: '1', // Select first party
    quickReplyPayload,
  });

  logInfo('Payload being sent:');
  console.log(JSON.stringify(payload, null, 2));

  logInfo('Calling instagram-webhook...');

  const result = await callFunction('instagram-webhook', payload);

  console.log('Response:', JSON.stringify(result.data, null, 2));

  if (result.ok) {
    logSuccess('Message webhook processed');

    // Check if mention was resolved
    const mentions = await querySupabase(
      'social_mentions',
      `organization_id=eq.${CONFIG.TEST_ORGANIZATION_ID}&instagram_user_id=eq.${CONFIG.TEST_USER_INSTAGRAM_ID}&order=created_at.desc&limit=1`
    );

    if (mentions && mentions[0]) {
      logInfo(`Mention status: ${mentions[0].party_selection_status}`);
      logInfo(`Matched fiesta: ${mentions[0].matched_fiesta_id || 'none'}`);

      if (mentions[0].party_selection_status === 'resolved') {
        logSuccess('Party selection resolved!');
        return true;
      }
    }
  }

  logError('Message response test failed');
  return false;
}

async function createTestMention(): Promise<string | null> {
  logSection('Setup: Create Test Mention');

  const mention = await mutateSupabase('social_mentions', 'POST', {
    organization_id: CONFIG.TEST_ORGANIZATION_ID,
    instagram_user_id: CONFIG.TEST_USER_INSTAGRAM_ID,
    instagram_username: CONFIG.TEST_USER_USERNAME,
    content: 'Test story mention',
    mention_type: 'story_referral',
    state: 'new',
    party_selection_status: 'pending_response',
    party_selection_message_sent_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago (for timeout test)
    party_options_sent: [
      { id: 'party-1', name: 'Test Party 1', payload: 'party_1_party-1' },
      { id: 'party-2', name: 'Test Party 2', payload: 'party_2_party-2' },
    ],
  });

  if (mention && mention[0]) {
    logSuccess(`Created test mention: ${mention[0].id}`);
    return mention[0].id;
  }

  logError('Failed to create test mention');
  return null;
}

async function cleanupTestData(): Promise<void> {
  logSection('Cleanup: Remove Test Data');

  // Delete test mentions
  await fetch(
    `${CONFIG.SUPABASE_URL}/rest/v1/social_mentions?instagram_user_id=eq.${CONFIG.TEST_USER_INSTAGRAM_ID}`,
    {
      method: 'DELETE',
      headers: {
        'apikey': CONFIG.SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${CONFIG.SERVICE_ROLE_KEY}`,
      },
    }
  );

  logSuccess('Test data cleaned up');
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

async function runAllTests() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║       PARTY SELECTION FEATURE - TEST SUITE               ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');

  logInfo(`Supabase URL: ${CONFIG.SUPABASE_URL}`);
  logInfo(`Organization ID: ${CONFIG.TEST_ORGANIZATION_ID}`);
  logInfo(`Test User ID: ${CONFIG.TEST_USER_INSTAGRAM_ID}`);

  const results: { test: string; passed: boolean }[] = [];

  // Test 1: Get active parties
  results.push({
    test: 'Get Active Parties',
    passed: await testGetActiveParties(),
  });

  // Test 2: Create a test mention and send party selection
  const testMentionId = await createTestMention();
  if (testMentionId) {
    results.push({
      test: 'Send Party Selection',
      passed: await testSendPartySelection(testMentionId),
    });
  }

  // Test 3: Timeout worker
  results.push({
    test: 'Timeout Worker',
    passed: await testTimeoutWorker(),
  });

  // Test 4: Full webhook flow (story mention)
  const webhookResult = await testWebhookStoryMention();
  results.push({
    test: 'Webhook - Story Mention',
    passed: webhookResult.success,
  });

  // Test 5: Message response
  if (webhookResult.mentionId) {
    results.push({
      test: 'Webhook - Message Response',
      passed: await testWebhookMessageResponse(),
    });
  }

  // Cleanup
  await cleanupTestData();

  // Summary
  logSection('TEST SUMMARY');

  let passed = 0;
  let failed = 0;

  results.forEach(r => {
    if (r.passed) {
      logSuccess(`${r.test}`);
      passed++;
    } else {
      logError(`${r.test}`);
      failed++;
    }
  });

  console.log('\n' + '-'.repeat(40));
  log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  console.log('-'.repeat(40) + '\n');
}

// ============================================================
// INTERACTIVE MODE
// ============================================================

async function interactiveMode() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║       PARTY SELECTION - INTERACTIVE TEST MODE            ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');

  console.log(`
Available commands:
  1. parties     - List active parties
  2. mention     - Create a test story mention
  3. message     - Simulate a message response
  4. timeout     - Run timeout worker
  5. status      - Check recent mentions status
  6. payload     - Print sample webhook payloads
  7. cleanup     - Remove test data
  8. all         - Run all tests
  9. exit        - Exit

Enter command number or name:
`);

  // For Node.js readline
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question('> ', async (answer) => {
      const cmd = answer.trim().toLowerCase();

      switch (cmd) {
        case '1':
        case 'parties':
          await testGetActiveParties();
          break;

        case '2':
        case 'mention':
          await testWebhookStoryMention();
          break;

        case '3':
        case 'message':
          await testWebhookMessageResponse();
          break;

        case '4':
        case 'timeout':
          await testTimeoutWorker();
          break;

        case '5':
        case 'status':
          logSection('Recent Mentions Status');
          const mentions = await querySupabase(
            'social_mentions',
            `organization_id=eq.${CONFIG.TEST_ORGANIZATION_ID}&order=created_at.desc&limit=5&select=id,instagram_username,party_selection_status,matched_fiesta_id,created_at`
          );
          console.log(JSON.stringify(mentions, null, 2));
          break;

        case '6':
        case 'payload':
          logSection('Sample Webhook Payloads');
          console.log('\n--- Story Mention Payload ---');
          console.log(JSON.stringify(generateStoryMentionPayload(), null, 2));
          console.log('\n--- Message Response Payload ---');
          console.log(JSON.stringify(generateMessagePayload({ messageText: '1' }), null, 2));
          console.log('\n--- Quick Reply Response Payload ---');
          console.log(JSON.stringify(generateMessagePayload({
            messageText: 'Party Name',
            quickReplyPayload: 'party_1_uuid-here'
          }), null, 2));
          break;

        case '7':
        case 'cleanup':
          await cleanupTestData();
          break;

        case '8':
        case 'all':
          await runAllTests();
          break;

        case '9':
        case 'exit':
        case 'quit':
        case 'q':
          rl.close();
          process.exit(0);
          return;

        default:
          console.log('Unknown command. Enter 1-9 or command name.');
      }

      prompt();
    });
  };

  prompt();
}

// ============================================================
// ENTRY POINT
// ============================================================

const args = process.argv.slice(2);

if (args.includes('--interactive') || args.includes('-i')) {
  interactiveMode();
} else if (args.includes('--payload')) {
  console.log('\n=== Story Mention Webhook Payload ===\n');
  console.log(JSON.stringify(generateStoryMentionPayload(), null, 2));
  console.log('\n=== Message Response Webhook Payload ===\n');
  console.log(JSON.stringify(generateMessagePayload({ messageText: '1' }), null, 2));
} else {
  runAllTests();
}
