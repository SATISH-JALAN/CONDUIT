import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { bondBoxes } from './schema.js';
import { logger } from '../shared/logger.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://conduit:conduit_dev@localhost:5432/conduit';

const SEED_BOXES = [
  {
    id: 'us-treasury-10y',
    name: 'US Treasury 10Y',
    description: 'Long-duration US government bonds with AAA rating. Stable, low-risk yield backed by the full faith of the US government.',
    risk: 'Low' as const,
    apyBps: 420,
    durationYears: 10,
    minInvestment: 10000,
    assetType: 'Government' as const,
    flag: '🇺🇸',
    accentColor: 'var(--surge)',
  },
  {
    id: 'corporate-bond-a',
    name: 'Corporate Bond A',
    description: 'Investment-grade corporate debt from blue-chip companies. Medium risk with attractive yield premium over treasuries.',
    risk: 'Medium' as const,
    apyBps: 650,
    durationYears: 5,
    minInvestment: 50000,
    assetType: 'Corporate' as const,
    flag: '🏢',
    accentColor: 'var(--amber)',
  },
  {
    id: 'emerging-market-b',
    name: 'Emerging Market B',
    description: 'Sovereign debt from high-growth economies. Higher risk-reward profile with significant yield opportunity.',
    risk: 'High' as const,
    apyBps: 1200,
    durationYears: 3,
    minInvestment: 100000,
    assetType: 'Sovereign' as const,
    flag: '🌍',
    accentColor: 'var(--rose)',
  },
  {
    id: 'green-energy-fund',
    name: 'Green Energy Fund',
    description: 'ESG-compliant corporate bonds funding renewable energy projects. Medium risk with impact-positive allocation.',
    risk: 'Medium' as const,
    apyBps: 780,
    durationYears: 7,
    minInvestment: 25000,
    assetType: 'Corporate' as const,
    flag: '🌱',
    accentColor: 'var(--surge)',
  },
  {
    id: 'tech-growth-bond',
    name: 'Tech Growth Bond',
    description: 'High-yield corporate notes from leading technology firms. Higher volatility but strong carry potential.',
    risk: 'High' as const,
    apyBps: 1550,
    durationYears: 2,
    minInvestment: 500000,
    assetType: 'Corporate' as const,
    flag: '💻',
    accentColor: 'var(--violet)',
  },
  {
    id: 'german-bund-2027',
    name: 'German Bund 2027',
    description: 'German government bonds — Europe\'s benchmark safe-haven asset. AAA-rated with low duration risk.',
    risk: 'Low' as const,
    apyBps: 384,
    durationYears: 3,
    minInvestment: 10000,
    assetType: 'Government' as const,
    flag: '🇩🇪',
    accentColor: 'var(--sky)',
  },
  {
    id: 'ondo-usdy',
    name: 'Ondo USDY',
    description: 'Tokenized US Treasury exposure via Ondo Finance. On-chain yield with institutional-grade backing.',
    risk: 'Low' as const,
    apyBps: 510,
    durationYears: 1,
    minInvestment: 10000,
    assetType: 'Government' as const,
    flag: '🌐',
    accentColor: 'var(--surge)',
  },
  {
    id: 'benji-franklin',
    name: 'Franklin BENJI',
    description: 'Franklin Templeton\'s on-chain money market fund. Short-duration government securities with daily liquidity.',
    risk: 'Low' as const,
    apyBps: 450,
    durationYears: 1,
    minInvestment: 10000,
    assetType: 'Government' as const,
    flag: '🏛️',
    accentColor: 'var(--amber)',
  },
];

async function seed() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  logger.info('Seeding bond boxes...');

  for (const box of SEED_BOXES) {
    await db.insert(bondBoxes)
      .values(box)
      .onConflictDoUpdate({
        target: bondBoxes.id,
        set: {
          name: box.name,
          description: box.description,
          risk: box.risk,
          apyBps: box.apyBps,
          durationYears: box.durationYears,
          minInvestment: box.minInvestment,
          assetType: box.assetType,
          flag: box.flag,
          accentColor: box.accentColor,
        },
      });
  }

  logger.info(`Seeded ${SEED_BOXES.length} bond boxes`);
  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
