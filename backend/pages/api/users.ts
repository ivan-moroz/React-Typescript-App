import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';

type UserPayload = {
  name?: string;
  email?: string;
  age?: number;
  city?: string;
};

type ErrorResponse = { message: string };

function setCors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<unknown | ErrorResponse>,
) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
      res.status(200).json(users);
      return;
    }

    if (req.method === 'POST') {
      const body = req.body as UserPayload;
      if (!body?.name || !body?.email || body.age === undefined || !body?.city) {
        res.status(400).json({ message: 'name, email, age and city are required' });
        return;
      }

      const user = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          age: body.age,
          city: body.city,
        },
      });

      res.status(201).json(user);
      return;
    }

    if (req.method === 'PUT') {
      const id = Number(req.query.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ message: 'A numeric id query parameter is required' });
        return;
      }

      const body = req.body as UserPayload;
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.email !== undefined ? { email: body.email } : {}),
          ...(body.age !== undefined ? { age: body.age } : {}),
          ...(body.city !== undefined ? { city: body.city } : {}),
        },
      });

      res.status(200).json(user);
      return;
    }

    if (req.method === 'DELETE') {
      const id = Number(req.query.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ message: 'A numeric id query parameter is required' });
        return;
      }

      await prisma.user.delete({ where: { id } });
      res.status(204).end();
      return;
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('users api error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
