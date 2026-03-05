import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type DbUser = {
  id: number;
  name: string;
  email: string;
  age: number;
  city: string;
};

type UserInput = {
  name?: string;
  email?: string;
  age?: number | string;
  city?: string;
};

const DEFAULT_USERS = [
  { name: 'User 1', email: 'user1@example.com', age: 20, city: 'City 1' },
  { name: 'User 2', email: 'user2@example.com', age: 21, city: 'City 2' },
  { name: 'User 3', email: 'user3@example.com', age: 22, city: 'City 3' },
  { name: 'User 4', email: 'user4@example.com', age: 23, city: 'City 4' },
  { name: 'User 5', email: 'user5@example.com', age: 24, city: 'City 5' },
];

const pgConfig = {
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: process.env.POSTGRES_PORT ?? '5432',
  database: process.env.POSTGRES_DB ?? 'react_typescript_app',
  user: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? 'postgres',
};

let isInitialized = false;

const runSql = async (sql: string): Promise<string> => {
  const { stdout } = await execFileAsync(
    'psql',
    [
      '-h',
      pgConfig.host,
      '-p',
      pgConfig.port,
      '-U',
      pgConfig.user,
      '-d',
      pgConfig.database,
      '-t',
      '-A',
      '-F',
      ',',
      '-c',
      sql,
    ],
    {
      env: {
        ...process.env,
        PGPASSWORD: pgConfig.password,
      },
    },
  );

  return stdout.trim();
};

const ensureUsersTable = async (): Promise<void> => {
  if (isInitialized) {
    return;
  }

  await runSql(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      age INTEGER NOT NULL,
      city TEXT NOT NULL
    );
  `);

  const countOutput = await runSql('SELECT COUNT(*) FROM users;');
  const count = Number(countOutput || '0');

  if (count === 0) {
    for (const user of DEFAULT_USERS) {
      await runSql(
        `INSERT INTO users (name, email, age, city) VALUES ('${user.name}', '${user.email}', ${user.age}, '${user.city}');`,
      );
    }
  }

  isInitialized = true;
};

export const getUsers = async (): Promise<DbUser[]> => {
  await ensureUsersTable();

  const output = await runSql('SELECT id, name, email, age, city FROM users ORDER BY id ASC;');
  if (!output) {
    return [];
  }

  return output.split('\n').map((line) => {
    const [id, name, email, age, city] = line.split(',');
    return {
      id: Number(id),
      name,
      email,
      age: Number(age),
      city,
    };
  });
};

export const addUser = async (input: UserInput): Promise<DbUser> => {
  await ensureUsersTable();

  const name = (input.name?.trim() || 'New User').replaceAll("'", "''");
  const email = (input.email?.trim() || `user${Date.now()}@example.com`).replaceAll("'", "''");
  const age = Number(input.age ?? 18);
  const safeAge = Number.isNaN(age) ? 18 : age;
  const city = (input.city?.trim() || 'Unknown').replaceAll("'", "''");

  const output = await runSql(`
    INSERT INTO users (name, email, age, city)
    VALUES ('${name}', '${email}', ${safeAge}, '${city}')
    RETURNING id, name, email, age, city;
  `);

  const [id, createdName, createdEmail, createdAge, createdCity] = output.split(',');

  return {
    id: Number(id),
    name: createdName,
    email: createdEmail,
    age: Number(createdAge),
    city: createdCity,
  };
};
