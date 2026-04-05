import '../shared/env.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { logger } from '../shared/logger.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://conduit:conduit_dev@localhost:5432/conduit';

async function runMigrations() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  logger.info('Running migrations...');

  await migrate(db, { migrationsFolder: './drizzle' });

  logger.info('Migrations complete');
  await client.end();
  process.exit(0);
}

runMigrations().catch((err) => {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
});
