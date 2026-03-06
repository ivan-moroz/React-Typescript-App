import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../lib/prisma';

type UserResponse =
  | {
      id: number;
      name: string;
      email: string;
      age: number;
      city: string;
    }
  | { message: string };

function setCors(res: NextApiResponse<unknown>) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<UserResponse>) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const id = Number(req.query.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: 'Invalid user id' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, age: true, city: true },
      });

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.status(200).json(user);
      return;
    } catch (error) {
      res.status(500).json({ message: `Unable to fetch user: ${String(error)}` });
      return;
    }
  }

  if (req.method === 'PUT') {
    const { name, email, age, city } = req.body ?? {};

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof age !== 'number' ||
      typeof city !== 'string'
    ) {
      res.status(400).json({ message: 'Invalid payload' });
      return;
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { name, email, age, city },
        select: { id: true, name: true, email: true, age: true, city: true },
      });

      res.status(200).json(updatedUser);
      return;
    } catch (error) {
      res.status(500).json({ message: `Unable to update user: ${String(error)}` });
      return;
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.user.delete({ where: { id } });
      res.status(200).json({ message: 'User deleted' });
      return;
    } catch (error) {
      res.status(500).json({ message: `Unable to delete user: ${String(error)}` });
      return;
    }
  }

  res.status(405).json({ message: 'Method not allowed' });
}
