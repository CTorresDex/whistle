import { SQL } from "bun";

export type Sql = SQL;

export function createSql(databaseUrl: string): Sql {
  return new SQL(databaseUrl);
}

export async function waitForDb(sql: Sql, attempts = 30, delayMs = 1000): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await sql`SELECT 1`;
      return;
    } catch (error) {
      if (i === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function migrate(sql: Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS users_username_idx ON users (username)`;
  await sql`
    CREATE TABLE IF NOT EXISTS audio (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL
    )
  `;
}

export interface UserRow {
  id: number;
  username: string;
  password: string;
}

export interface AudioRow {
  id: number;
  title: string;
  url: string;
}
