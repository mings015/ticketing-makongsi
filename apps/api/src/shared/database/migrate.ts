import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './index';
import { runSeed } from './seed';

export async function runMigrations() {
  await migrate(db, {
    migrationsFolder: new URL('./migrations', import.meta.url).pathname,
  });
  await runSeed();
}
