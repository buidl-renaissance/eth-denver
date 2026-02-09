import 'dotenv/config';
import type { Config } from 'drizzle-kit';

const useLocal = process.env.USE_LOCAL === 'true' || !process.env.TURSO_AUTH_TOKEN;

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: useLocal ? 'sqlite' : 'turso',
  dbCredentials: useLocal 
    ? { url: 'file:./dev.sqlite3' }
    : {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
      },
} satisfies Config;
