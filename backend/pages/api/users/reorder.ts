import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../lib/prisma';

type User = {
  id: number;
  name: string;
  email: string;
  age: number;
  city: string;
};

type Response = User[] | { message: string };

function setCors<T>(res: NextApiResponse<T>) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'PUT') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const userIds = req.body?.userIds;
  if (!Array.isArray(userIds) || userIds.length === 0 || userIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    res.status(400).json({ message: 'Invalid user order' });
    return;
  }

  if (new Set(userIds).size !== userIds.length) {
    res.status(400).json({ message: 'User ids must be unique' });
    return;
  }

  try {
    const users = await prisma.$transaction(async (transaction) => {
      const existingUsers = await transaction.user.findMany({
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });

      const existingUserIds = new Set(existingUsers.map((user) => user.id));
      if (userIds.some((id) => !existingUserIds.has(id))) {
        throw new Error('The order contains a user that does not exist');
      }

      const reorderedUserIds = [
        ...userIds,
        ...existingUsers.map((user) => user.id).filter((id) => !userIds.includes(id)),
      ];

      await Promise.all(
        reorderedUserIds.map((id, position) => transaction.user.update({ where: { id }, data: { position } }))
      );

      return transaction.user.findMany({
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, email: true, age: true, city: true },
      });
    });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: `Unable to save user order: ${String(error)}` });
  }
}
