import { ERROR_MESSAGES } from "../../../../src/constants/errors";
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
    res.status(405).json({ message: ERROR_MESSAGES.METHOD_NOT_ALLOWED });
    return;
  }

  const userIds = req.body?.userIds;
  if (!Array.isArray(userIds) || userIds.length === 0 || userIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    res.status(400).json({ message: ERROR_MESSAGES.USER_ORDER_INVALID });
    return;
  }

  if (new Set(userIds).size !== userIds.length) {
    res.status(400).json({ message: ERROR_MESSAGES.USER_IDS_DUPLICATE });
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
        throw new Error(ERROR_MESSAGES.USER_ORDER_UNKNOWN_USER);
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
    res.status(500).json({ message: ERROR_MESSAGES.USER_ORDER_SAVE_DETAILS(error) });
  }
}
