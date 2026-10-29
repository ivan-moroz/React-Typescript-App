import type { NextApiRequest, NextApiResponse } from 'next';
import { clearSessionCookie } from '../../../lib/session';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end();
    return;
  }
  res.setHeader('Set-Cookie', clearSessionCookie);
  const from = typeof req.body?.from === 'string' && req.body.from.startsWith('/') && !req.body.from.startsWith('//')
    ? req.body.from
    : '/';
  res.redirect(303, `/login?from=${encodeURIComponent(from)}`);
}
