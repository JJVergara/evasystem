/**
 * Cryptographic utilities for secure token storage
 * Uses AES-GCM encryption with base64 encoding
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Get encryption key from environment
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyHex = "40c280da434d3017b4a97ea81014c05466a7dda359e611b98d89addaa5352bce";//Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!keyHex) {
    throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  }

  // validate: exactly 64 hex chars
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes).');
  }

  const keyBytes = new Uint8Array(
    keyHex.match(/.{2}/g)!.map((b) => parseInt(b, 16))
  );

  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt a token string
 */
export async function encryptToken(token: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encodedToken = new TextEncoder().encode(token);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encodedToken
    );
    
    // Combine IV + encrypted data and encode as base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Token encryption failed (raw):', error);
    throw new Error(
      `Failed to encrypt token: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Decrypt a token string
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const combined = new Uint8Array(
      atob(encryptedToken).split('').map(char => char.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Token decryption failed:', error);
    throw new Error(
      `Failed to decrypt token: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Check if a string looks like an encrypted token (base64)
 */
export function isEncrypted(value: string): boolean {
  try {
    // Check if it's valid base64 and has reasonable length
    const decoded = atob(value);
    return decoded.length > IV_LENGTH && value.length > 16;
  } catch {
    return false;
  }
}

/**
 * Safely migrate plain text token to encrypted
 */
export async function migrateToken(token: string): Promise<string> {
  // If already encrypted, return as-is
  if (isEncrypted(token)) {
    return token;
  }
  
  // Otherwise encrypt it
  return await encryptToken(token);
}

/**
 * Safely decrypt token (handles both encrypted and plain text)
 * This is for backward compatibility during migration
 */
export async function safeDecryptToken(token: string): Promise<string> {
  // If it looks like plain text, return as-is
  if (!isEncrypted(token)) {
    console.warn('Found unencrypted token - consider migrating');
    return token;
  }
  
  // Otherwise decrypt it
  return await decryptToken(token);
}
