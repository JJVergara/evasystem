/**
 * Test script for crypto functions
 * Run with: deno run --allow-env --allow-net supabase/functions/shared/crypto.test.ts
 */

import {
  encryptToken,
  decryptToken,
  isEncrypted,
  migrateToken,
  safeDecryptToken,
} from './crypto.ts';

async function testCrypto() {
  void ('🧪 Testing crypto functions...\n');

  // Test token
  const testToken =
    'p96SboOg6zcEJZPHTNahwAm3B5/y65AESw1Jv91Ox4KaCzguWe+X1ihAG21m1YH7qVOZixTQSwJUNZ8nhzwU/rEHXmVAsLpcSeizDZeGAktdS9DvkE2RxKtCKpmIA6sEhU9Jc3qEKEtyVsvIqzUGbGQyKG0ta1d7wKPacFLqFpOZSC+ttixC2pD8qWk6EoMWtDFEoY0l1ASfHFoAkbcTfsweZcPMt1tuwYiXLOTVH3995lNW0KWLUSEfV2MNFuXBi5OD+n58F2/rwH8tL5jC8hvm7KO+aJ1gatI5eGxRAmSY';

  try {
    // Test 1: Check if token is encrypted
    void ('Test 1: Checking if token is encrypted...');
    const isEnc = isEncrypted(testToken);
    void (`   Result: ${isEnc ? 'Encrypted' : 'Plain text'}\n`);

    // Test 2: Encrypt a plain text token
    void ('Test 2: Encrypting token...');
    const plainToken = 'test_token_12345';
    const encrypted = await encryptToken(plainToken);
    void (`   Encrypted: ${encrypted.substring(0, 50)}...\n`);

    // Test 3: Decrypt the encrypted token
    void ('Test 3: Decrypting token...');
    const decrypted = await decryptToken(encrypted);
    void (`   Decrypted: ${decrypted}`);
    void (`   Match: ${decrypted === plainToken ? '✅' : '❌'}\n`);

    // Test 4: Try to decrypt the test token (if it's encrypted)
    if (isEnc) {
      void ('Test 4: Decrypting provided token...');
      try {
        const decryptedTest = await decryptToken(testToken);
        void (`   Decrypted: ${decryptedTest}\n`);
      } catch (error) {
        void (
          `   ⚠️  Could not decrypt (likely encrypted with different key): ${error instanceof Error ? error.message : String(error)}\n`
        );
      }
    } else {
      void ('Test 4: Token is plain text, encrypting it...');
      const encryptedTest = await encryptToken(testToken);
      void (`   Encrypted: ${encryptedTest.substring(0, 50)}...\n`);
    }

    // Test 5: Test migrateToken
    void ('Test 5: Testing migrateToken...');
    const migrated = await migrateToken(plainToken);
    void (`   Migrated: ${migrated.substring(0, 50)}...`);
    void (`   Is encrypted: ${isEncrypted(migrated) ? '✅' : '❌'}\n`);

    // Test 6: Test safeDecryptToken
    void ('Test 6: Testing safeDecryptToken...');
    const safeDecrypted = await safeDecryptToken(encrypted);
    void (`   Safe decrypted: ${safeDecrypted}`);
    void (`   Match: ${safeDecrypted === plainToken ? '✅' : '❌'}\n`);

    void ('✅ All tests completed!');
  } catch (error) {
    void ('❌ Test failed:', error);
    Deno.exit(1);
  }
}

// Run tests
testCrypto();
