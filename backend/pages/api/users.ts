import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../lib/prisma';

type UserPayload = {
  name: string;
  email: string;
  age: number;
  city: string;
};

type ErrorResponse = { message: string };

type UsersResponse =
  | Array<{
      id: number;
      name: string;
      email: string;
      age: number;
      city: string;
    }>
  | ErrorResponse;

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function setCors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function isValidUserPayload(payload: Partial<UserPayload>): payload is UserPayload {
  return (
    typeof payload.name === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.age === 'number' &&
    typeof payload.city === 'string'
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<UsersResponse>) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const offset = Number(req.query.offset ?? 0);
      const requestedLimit = Number(req.query.limit ?? DEFAULT_PAGE_SIZE);
      const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);

      if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1) {
        res.status(400).json({ message: 'offset must be a non-negative integer and limit must be a positive integer' });
        return;
      }

      const users = await prisma.user.findMany({
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        skip: offset,
        take: limit,
        select: { id: true, name: true, email: true, age: true, city: true },
      });

      res.status(200).json(users);
      return;
    } catch (error) {
      res.status(500).json({ message: `Unable to fetch users: ${String(error)}` });
      return;
    }
  }

  if (req.method === 'POST') {
    if (!isValidUserPayload(req.body ?? {})) {
      res.status(400).json({ message: 'Invalid payload' });
      return;
    }

    try {
      const lastUser = await prisma.user.findFirst({
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const createdUser = await prisma.user.create({
        data: { ...req.body, position: (lastUser?.position ?? -1) + 1 },
        select: { id: true, name: true, email: true, age: true, city: true },
      });

      res.status(201).json([createdUser]);
      return;
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        res.status(409).json({ message: 'Email address is already in use' });
        return;
      }

      res.status(500).json({ message: `Unable to create user: ${String(error)}` });
      return;
    }
  }

  res.status(405).json({ message: 'Method not allowed' });
}
