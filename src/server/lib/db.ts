import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createLogger } from '~/server/infrastructure/logging/logger-factory';
import type { DatabaseConfig } from '~/server/config/types';
import { schema } from '~/server/infrastructure/db/schema';

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

let dbConfig: DatabaseConfig;
let logger: ReturnType<typeof createLogger>;

let client: ReturnType<typeof postgres>;
let db: DrizzleDB;

/**
 * Initialize database configuration
 * Must be called before using any database functions
 */
export function initializeDatabaseConfig(config: DatabaseConfig, nodeEnv: 'development' | 'production' | 'test'): void {
  dbConfig = config;
  logger = createLogger({ environment: nodeEnv });
}

export async function connectToDatabase(): Promise<{ client: ReturnType<typeof postgres>; db: DrizzleDB }> {
  if (!dbConfig) {
    throw new Error('Database configuration not initialized. Call initializeDatabaseConfig first.');
  }
  if (client && db) {
    return { client, db };
  }

  try {
    // Create PostgreSQL client
    client = postgres(dbConfig.url, {
      max: 10, // Maximum number of connections in pool
      idle_timeout: 20, // Seconds before closing idle connections
      connect_timeout: 10, // Seconds to wait for connection
    });

    // Create Drizzle instance with schema
    db = drizzle(client, { 
      schema,
      logger: process.env.NODE_ENV === 'development', // Enable query logging in development
    });

    // Test connection
    await client`SELECT 1`;

    logger.info('Connected to PostgreSQL database', { 
      url: dbConfig.url.replace(/\/\/[^:]*:[^@]*@/, '//***:***@'), // Hide credentials
    });

    return { client, db };
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL', {
      error: error instanceof Error ? error.message : String(error),
      url: dbConfig.url.replace(/\/\/[^:]*:[^@]*@/, '//***:***@'), // Hide credentials
    });
    throw error;
  }
}

export async function getDatabase(): Promise<DrizzleDB> {
  if (!db) {
    const { db: database } = await connectToDatabase();
    return database;
  }
  return db;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.end();
    logger.info('Disconnected from PostgreSQL');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  void (async () => {
    await closeDatabaseConnection();
    process.exit(0);
  })();
});

process.on('SIGTERM', () => {
  void (async () => {
    await closeDatabaseConnection();
    process.exit(0);
  })();
});
