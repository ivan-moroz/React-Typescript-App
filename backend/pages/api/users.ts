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

function setCors(res: NextApiResponse<unknown>) {
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
      const users = await prisma.user.findMany({
        orderBy: { id: 'asc' },
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
      const createdUser = await prisma.user.create({
        data: req.body,
        select: { id: true, name: true, email: true, age: true, city: true },
      });

      res.status(201).json([createdUser]);
      return;
    } catch (error) {
      res.status(500).json({ message: `Unable to create user: ${String(error)}` });
      return;
    }
  }

  res.status(405).json({ message: 'Method not allowed' });
}
