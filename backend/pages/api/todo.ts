import type { NextApiRequest, NextApiResponse } from 'next';

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

const todo: Todo = {
  id: 1,
  text: 'Learn React + TypeScript',
  completed: false,
};

export default function handler(req: NextApiRequest, res: NextApiResponse<Todo | { message: string }>) {
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

  res.status(200).json(todo);
}
