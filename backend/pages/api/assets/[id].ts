import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../lib/prisma';

type ErrorResponse = { message: string };
type Authorization = 'INTERNAL' | 'PUBLIC';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function setCors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function userIdFrom(value: unknown): number | null {
  const userId = typeof value === 'string' ? Number(value) : value;
  return typeof userId === 'number' && Number.isInteger(userId) && userId > 0 ? userId : null;
}

function isAuthorization(value: unknown): value is Authorization {
  return value === 'INTERNAL' || value === 'PUBLIC';
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
      const asset = await prisma.asset.findFirst({ where: { id, OR: [{ userId }, { authorization: 'PUBLIC' }] } });
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

  if (req.method === 'PUT') {
    const { name, description, authorization, type, size, data } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim() || typeof description !== 'string' || !isAuthorization(authorization)) {
      res.status(400).json({ message: 'Invalid asset payload' });
      return;
    }

    const hasReplacementFile = data !== undefined || type !== undefined || size !== undefined;
    let fileUpdate = {};
    if (hasReplacementFile) {
      if (typeof type !== 'string' || typeof size !== 'number' || !Number.isInteger(size) || size < 0 || typeof data !== 'string') {
        res.status(400).json({ message: 'Invalid replacement file' });
        return;
      }
      const fileData = Buffer.from(data, 'base64');
      if (fileData.length !== size || size > MAX_FILE_SIZE) {
        res.status(400).json({ message: 'Asset data is invalid or exceeds the 10 MB limit' });
        return;
      }
      fileUpdate = { mimeType: type || 'application/octet-stream', size, data: fileData };
    }

    try {
      const updated = await prisma.asset.updateMany({
        where: { id, userId },
        data: { name: name.trim(), description, authorization, ...fileUpdate },
      });
      if (!updated.count) {
        res.status(404).json({ message: 'Asset not found' });
        return;
      }
      res.status(204).end();
    } catch {
      res.status(500).json({ message: 'Unable to update asset' });
    }
    return;
  }

  res.status(405).json({ message: 'Method not allowed' });
}
