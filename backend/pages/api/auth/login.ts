import { ERROR_MESSAGES } from "../../../../src/constants/errors";
import type { NextApiRequest, NextApiResponse } from 'next';
import { TLSSocket } from 'node:tls';

import prisma from '../../../lib/prisma';
import { verifyPassword } from '../../../lib/password';
import { sessionCookie } from '../../../lib/session';

type Response = { id: number; name: string; email: string } | { message: string };

function setCors(res: NextApiResponse<Response>) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ message: ERROR_MESSAGES.METHOD_NOT_ALLOWED });
    return;
  }

  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    res.status(400).json({ message: ERROR_MESSAGES.LOGIN_FIELDS_REQUIRED });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
      select: { id: true, name: true, email: true, passwordHash: true },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ message: ERROR_MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    res.setHeader('Set-Cookie', sessionCookie(user, (req.socket instanceof TLSSocket && req.socket.encrypted) || req.headers['x-forwarded-proto'] === 'https'));
    res.status(200).json({ id: user.id, name: user.name, email: user.email });
  } catch {
    res.status(500).json({ message: ERROR_MESSAGES.LOGIN_FAILED });
  }
}
