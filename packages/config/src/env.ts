import { z } from 'zod';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  FIREBASE_URL: z.string().min(1),
  GAME_API_KEY: z.string().min(1),
  LEONARDO_API_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;
export const env: Env = envSchema.parse(process.env);
