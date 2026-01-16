const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyHex = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!keyHex) {
    throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  }

  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes).');
  }

  const keyBytes = new Uint8Array(keyHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));

  return await crypto.subtle.importKey('raw', keyBytes, { name: ALGORITHM }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptToken(token: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encodedToken = new TextEncoder().encode(token);

    const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encodedToken);

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Token encryption failed (raw):', error);
    throw new Error(
      `Failed to encrypt token: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const combined = new Uint8Array(
      atob(encryptedToken)
        .split('')
        .map((char) => char.charCodeAt(0))
    );

    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, encrypted);

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Token decryption failed:', error);
    throw new Error(
      `Failed to decrypt token: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function isEncrypted(value: string): boolean {
  try {
    const decoded = atob(value);
    return decoded.length > IV_LENGTH && value.length > 16;
  } catch {
    return false;
  }
}

export async function migrateToken(token: string): Promise<string> {
  if (isEncrypted(token)) {
    return token;
  }

  return await encryptToken(token);
}

export async function safeDecryptToken(token: string): Promise<string> {
  if (!isEncrypted(token)) {
    console.warn('Found unencrypted token - consider migrating');
    return token;
  }

  return await decryptToken(token);
}
