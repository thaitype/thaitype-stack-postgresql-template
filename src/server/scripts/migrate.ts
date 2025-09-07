/**
 * Database Migration Script
 * 
 * This script runs database migrations using Drizzle ORM.
 * It's designed to be run directly or as part of deployment scripts.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../../env';

async function runMigrations() {
  console.log('🚀 Starting database migrations...');

  try {
    // Create PostgreSQL client for migrations
    const migrationClient = postgres(env.DATABASE_URL, { 
      max: 1,
      onnotice: () => {
        // Suppress PostgreSQL notices during migration - intentionally empty
      },
    });

    const db = drizzle(migrationClient);

    // Run migrations
    await migrate(db, { migrationsFolder: './drizzle' });

    console.log('✅ Database migrations completed successfully');
    
    // Close the connection
    await migrationClient.end();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch((error) => {
    console.error('Fatal migration error:', error);
    process.exit(1);
  });
}

export { runMigrations };