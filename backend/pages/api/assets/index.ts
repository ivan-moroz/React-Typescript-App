import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../lib/prisma';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type AssetSummary = {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
};

type ErrorResponse = { message: string };

export const config = {
  api: {
    bodyParser: { sizeLimit: '15mb' },
  },
};

function setCors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function userIdFrom(value: unknown): number | null {
  const userId = typeof value === 'string' ? Number(value) : value;
  return typeof userId === 'number' && Number.isInteger(userId) && userId > 0 ? userId : null;
}

function toSummary(asset: { id: string; name: string; mimeType: string; size: number; createdAt: Date }): AssetSummary {
  return { id: asset.id, name: asset.name, type: asset.mimeType, size: asset.size, createdAt: asset.createdAt.toISOString() };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<AssetSummary[] | AssetSummary | ErrorResponse>) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const userId = userIdFrom(req.method === 'GET' ? req.query.userId : req.body?.userId);
  if (!userId) {
    res.status(400).json({ message: 'A valid userId is required' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const assets = await prisma.asset.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, mimeType: true, size: true, createdAt: true },
      });
      res.status(200).json(assets.map(toSummary));
    } catch {
      res.status(500).json({ message: 'Unable to load assets' });
    }
    return;
  }

  if (req.method === 'POST') {
    const { name, type, size, data } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim() || typeof type !== 'string' || typeof size !== 'number' || !Number.isInteger(size) || size < 0 || typeof data !== 'string') {
      res.status(400).json({ message: 'Invalid asset payload' });
      return;
    }

    const fileData = Buffer.from(data, 'base64');
    if (fileData.length !== size || size > MAX_FILE_SIZE) {
      res.status(400).json({ message: 'Asset data is invalid or exceeds the 10 MB limit' });
      return;
    }

    try {
      const asset = await prisma.asset.create({
        data: { userId, name: name.trim(), mimeType: type || 'application/octet-stream', size, data: fileData },
        select: { id: true, name: true, mimeType: true, size: true, createdAt: true },
      });
      res.status(201).json(toSummary(asset));
    } catch {
      res.status(500).json({ message: 'Unable to upload asset' });
    }
    return;
  }

  res.status(405).json({ message: 'Method not allowed' });
}
