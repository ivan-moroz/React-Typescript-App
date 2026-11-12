import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const HASH_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, HASH_LENGTH) as Buffer;

  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, hash] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !/^[0-9a-f]{128}$/i.test(hash)) {
    return false;
  }

  const expectedHash = Buffer.from(hash, 'hex');
  const derivedKey = await scryptAsync(password, salt, expectedHash.length) as Buffer;

  return expectedHash.length === derivedKey.length && timingSafeEqual(expectedHash, derivedKey);
}
