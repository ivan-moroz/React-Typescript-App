import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../lib/prisma';

type ErrorResponse = { message: string };

function setCors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function userIdFrom(value: unknown): number | null {
  const userId = typeof value === 'string' ? Number(value) : value;
  return typeof userId === 'number' && Number.isInteger(userId) && userId > 0 ? userId : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  const userId = userIdFrom(req.method === 'GET' ? req.query.userId : req.body?.userId);
  if (!id || !userId) {
    res.status(400).json({ message: 'An asset id and valid userId are required' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const asset = await prisma.asset.findFirst({ where: { id, userId } });
      if (!asset) {
        res.status(404).json({ message: 'Asset not found' });
        return;
      }
      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Content-Length', asset.size);
      const disposition = req.query.download === '1' ? 'attachment' : 'inline';
      res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(asset.name)}`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // Prisma returns Bytes as a Uint8Array. Next serializes a Uint8Array as JSON,
      // so convert it to a Buffer to send the original binary file bytes.
      res.status(200).send(Buffer.from(asset.data));
    } catch {
      res.status(500).json({ message: 'Unable to download asset' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      const deleted = await prisma.asset.deleteMany({ where: { id, userId } });
      if (!deleted.count) {
        res.status(404).json({ message: 'Asset not found' });
        return;
      }
      res.status(204).end();
    } catch {
      res.status(500).json({ message: 'Unable to delete asset' });
    }
    return;
  }

  res.status(405).json({ message: 'Method not allowed' });
}
