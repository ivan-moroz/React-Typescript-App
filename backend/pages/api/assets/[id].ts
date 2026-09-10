import type { NextApiRequest, NextApiResponse } from 'next';
import { extname } from 'node:path';

import prisma from '../../../lib/prisma';

type ErrorResponse = { message: string };
type Authorization = 'INTERNAL' | 'PUBLIC';
const MAX_FILE_SIZE = 1024 * 1024 * 1024;

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

function downloadName(asset: { name: string; fileExtension: string }): string {
  const extension = asset.fileExtension || extname(asset.name);
  return extension && !asset.name.toLowerCase().endsWith(extension.toLowerCase()) ? `${asset.name}${extension}` : asset.name;
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
      res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(downloadName(asset))}`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (asset.storageMode === 'INLINE' && asset.data) {
        // Prisma returns Bytes as a Uint8Array. Next serializes a Uint8Array as JSON,
        // so convert it to a Buffer to send the original binary file bytes.
        res.status(200).send(Buffer.from(asset.data));
        return;
      }

      res.status(200);
      for (let position = 0, sent = 0; sent < asset.size; position += 1) {
        const chunk = await prisma.assetChunk.findUnique({ where: { assetId_position: { assetId: id, position } } });
        if (!chunk) throw new Error('Asset chunk is missing');
        const bytes = Buffer.from(chunk.data);
        sent += bytes.length;
        res.write(bytes);
      }
      res.end();
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
    const { name, description, authorization, originalFileName, type, size } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim() || typeof description !== 'string' || !isAuthorization(authorization)) {
      res.status(400).json({ message: 'Invalid asset payload' });
      return;
    }

    const hasReplacementFile = type !== undefined || size !== undefined;
    let fileUpdate = {};
    if (hasReplacementFile) {
      if (typeof type !== 'string' || typeof size !== 'number' || !Number.isInteger(size) || size < 0 || size > MAX_FILE_SIZE) {
        res.status(400).json({ message: 'Invalid replacement file' });
        return;
      }
      fileUpdate = { mimeType: type || 'application/octet-stream', fileExtension: typeof originalFileName === 'string' ? extname(originalFileName).slice(0, 32) : '', size };
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
