import type { NextApiRequest, NextApiResponse } from 'next';
import { clearSessionCookie } from '../../../lib/session';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end();
    return;
  }
  res.setHeader('Set-Cookie', clearSessionCookie);
  res.status(204).end();
}
