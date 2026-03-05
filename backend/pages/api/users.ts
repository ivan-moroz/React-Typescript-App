import type { NextApiRequest, NextApiResponse } from 'next';

type User = {
  id: number;
  name: string;
  email: string;
  age: number;
  city: string;
};

const users: User[] = [
  { id: 1, name: 'User 1', email: 'user1@example.com', age: 20, city: 'City 1' },
  { id: 2, name: 'User 2', email: 'user2@example.com', age: 21, city: 'City 2' },
  { id: 3, name: 'User 3', email: 'user3@example.com', age: 22, city: 'City 3' },
  { id: 4, name: 'User 4', email: 'user4@example.com', age: 23, city: 'City 4' },
  { id: 5, name: 'User 5', email: 'user5@example.com', age: 24, city: 'City 5' },
];

export default function handler(req: NextApiRequest, res: NextApiResponse<User[] | { message: string }>) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  res.status(200).json(users);
}
