import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import prisma from './prisma';

const COOKIE = 'app_session';
const MAX_AGE = 60 * 60 * 24;
const signature = (payload: string, key: string) =>
  createHmac('sha256', key).update(`app-session:${payload}`).digest('hex');

// The private password hash signs the session and invalidates it on password changes.
export function sessionCookie(user: { id: number; passwordHash: string }, secure: boolean) {
  const payload = `${user.id}.${Math.floor(Date.now() / 1000) + MAX_AGE}`;
  return `${COOKIE}=${payload}.${signature(payload, user.passwordHash)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure ? '; Secure' : ''}`;
}

export const clearSessionCookie = `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export async function getSessionUser(req: IncomingMessage) {
  const token = req.headers.cookie?.split(';').map(value => value.trim())
    .find(value => value.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [id, expires, signed] = parts;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1 ||
      !/^\d+$/.test(expires) || Number(expires) <= Date.now() / 1000 || !/^[a-f0-9]{64}$/.test(signed)) return null;
  const user = await prisma.user.findUnique({ where: { id: Number(id) }, select: { id: true, name: true, passwordHash: true } });
  if (!user || !timingSafeEqual(Buffer.from(signed, 'hex'), Buffer.from(signature(`${id}.${expires}`, user.passwordHash), 'hex'))) return null;
  return { id: user.id, name: user.name };
}
