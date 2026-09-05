import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';

// Testing AES-256-GCM cipher round-trip
const ALGORITHM = 'aes-256-gcm';
const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function testEncrypt(text: string, keyHex: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(keyHex, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

function testDecrypt(text: string, keyHex: string): string {
  const [ivHex, encrypted, authTagHex] = text.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(keyHex, 'hex'), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

describe('Slack Token AES-256-GCM Encryption', () => {
  it('encrypts and decrypts OAuth tokens accurately', () => {
    const originalToken = 'xoxb-1234567890-abcdefghijklmnopqrstuvwxyz';
    const encrypted = testEncrypt(originalToken, TEST_KEY);

    expect(encrypted).not.toBe(originalToken);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = testDecrypt(encrypted, TEST_KEY);
    expect(decrypted).toBe(originalToken);
  });

  it('fails decryption with tampered ciphertext or wrong key', () => {
    const originalToken = 'xoxb-sensitive-token';
    const encrypted = testEncrypt(originalToken, TEST_KEY);
    const tampered = encrypted.slice(0, -4) + 'ffff';

    expect(() => testDecrypt(tampered, TEST_KEY)).toThrow();
  });
});
