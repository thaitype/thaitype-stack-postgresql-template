import { createLogger } from '~/server/infrastructure/logging/logger-factory';
import type { DatabaseConfig } from '~/server/config/types';
import { type Db, MongoClient } from 'mongodb';


let dbConfig: DatabaseConfig;
let logger: ReturnType<typeof createLogger>;

let client: MongoClient;
let db: Db;

/**
 * Initialize database configuration
 * Must be called before using any database functions
 */
export function initializeDatabaseConfig(config: DatabaseConfig, nodeEnv: 'development' | 'production' | 'test'): void {
  dbConfig = config;
  logger = createLogger({ environment: nodeEnv });
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (!dbConfig) {
    throw new Error('Database configuration not initialized. Call initializeDatabaseConfig first.');
  }
  if (client && db) {
    return { client, db };
  }

  try {
    client = new MongoClient(dbConfig.uri);
    await client.connect();
    db = client.db(dbConfig.name);

    logger.info('Connected to MongoDB', { database: dbConfig.name });

     // Skip index creation, it will be handled by migrations
    // Create indexes on first connection (in production, this should be done via migrations)
    // if (!indexesCreated && process.env.NODE_ENV !== 'test') {
    //   try {       
    //     await createDatabaseIndexes(db);
    //     indexesCreated = true;
    //   } catch (error) {
    //     logger.warn('Failed to create database indexes', {
    //       error: error instanceof Error ? error.message : String(error),
    //     });
    //     // Don't fail the connection if index creation fails
    //   }
    // }

    return { client, db };
  } catch (error) {
    logger.error('Failed to connect to MongoDB', {
      error: error instanceof Error ? error.message : String(error),
      uri: dbConfig.uri.replace(/\/\/[^:]*:[^@]*@/, '//***:***@'), // Hide credentials
    });
    throw error;
  }
}

export async function getDatabase(): Promise<Db> {
  if (!db) {
    const { db: database } = await connectToDatabase();
    return database;
  }
  return db;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    logger.info('Disconnected from MongoDB');
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
