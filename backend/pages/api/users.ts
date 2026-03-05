import type { NextApiRequest, NextApiResponse } from 'next';
import { addUser, getUsers } from '../../utils/postgres';

type User = {
  id: number;
  name: string;
  email: string;
  age: number;
  city: string;
};

type ErrorResponse = { message: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<User[] | User | ErrorResponse>) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const users = await getUsers();
      res.status(200).json(users);
      return;
    } catch {
      res.status(500).json({ message: 'Failed to load users from database' });
      return;
    }
  }

  if (req.method === 'POST') {
    try {
      const newUser = await addUser(req.body);
      res.status(201).json(newUser);
      return;
    } catch {
      res.status(500).json({ message: 'Failed to create user in database' });
      return;
    }
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }
}
