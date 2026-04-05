import './env.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema.js';
import { logger } from './logger.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://conduit:conduit_dev@localhost:5432/conduit';

// Connection pool for queries
const queryClient = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // suppress notices
});

export const db = drizzle(queryClient, { schema });

logger.info('Database client initialized');
