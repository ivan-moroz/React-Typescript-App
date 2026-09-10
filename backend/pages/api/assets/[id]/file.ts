import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../../lib/prisma';

const MAX_FILE_SIZE = 1024 * 1024 * 1024;
const CHUNK_SIZE = 8 * 1024 * 1024;

export const config = { api: { bodyParser: false } };

function userIdFrom(value: unknown): number | null {
  const userId = typeof value === 'string' ? Number(value) : value;
  return typeof userId === 'number' && Number.isInteger(userId) && userId > 0 ? userId : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'PUT') { res.status(405).json({ message: 'Method not allowed' }); return; }

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  const userId = userIdFrom(req.query.userId);
  const expectedSize = Number(req.headers['content-length']);
  if (!id || !userId || !Number.isInteger(expectedSize) || expectedSize < 0 || expectedSize > MAX_FILE_SIZE) {
    res.status(400).json({ message: 'A file up to 1 GB and a valid userId are required' });
    return;
  }

  const asset = await prisma.asset.findFirst({ where: { id, userId }, select: { id: true, size: true } });
  if (!asset || asset.size !== expectedSize) { res.status(404).json({ message: 'Asset not found or file size changed' }); return; }

  let position = 0;
  let pending = Buffer.alloc(0);
  let received = 0;
  try {
    await prisma.assetChunk.deleteMany({ where: { assetId: id } });
    for await (const part of req) {
      const chunk = Buffer.from(part);
      received += chunk.length;
      if (received > MAX_FILE_SIZE) throw new Error('File exceeds limit');
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= CHUNK_SIZE) {
        await prisma.assetChunk.create({ data: { assetId: id, position: position++, data: pending.subarray(0, CHUNK_SIZE) } });
        pending = pending.subarray(CHUNK_SIZE);
      }
    }
    if (pending.length) await prisma.assetChunk.create({ data: { assetId: id, position, data: pending } });
    if (received !== expectedSize) throw new Error('Upload was incomplete');
    await prisma.asset.update({ where: { id }, data: { data: null, storageMode: 'CHUNKED' } });
    res.status(204).end();
  } catch {
    await prisma.assetChunk.deleteMany({ where: { assetId: id } });
    res.status(500).json({ message: 'Unable to store uploaded file' });
  }
}
