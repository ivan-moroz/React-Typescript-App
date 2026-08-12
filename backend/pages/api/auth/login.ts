import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../lib/prisma';
import { verifyPassword } from '../../../lib/password';

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
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
      select: { id: true, name: true, email: true, passwordHash: true },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    res.status(200).json({ id: user.id, name: user.name, email: user.email });
  } catch {
    res.status(500).json({ message: 'Unable to log in' });
  }
}
