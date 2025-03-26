import { env } from '@acpl/config/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const client = postgres(env.DATABASE_URL, { prepare: false });
export const db = drizzle(client, { schema });

export default db;
