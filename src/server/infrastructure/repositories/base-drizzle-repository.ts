import type { ILogger } from '@thaitype/core-utils';
import { eq } from 'drizzle-orm';
import { getDatabase } from '~/server/lib/db';

/**
 * Base Drizzle Repository Class
 * Simple CRUD operations without audit logging
 */
export abstract class BaseDrizzleRepository {
  protected db?: Awaited<ReturnType<typeof getDatabase>>;
  protected entityName: string;

  constructor(entityName: string) {
    this.entityName = entityName;
  }

  /**
   * Initialize database connection
   */
  protected async initializeDatabase(): Promise<void> {
    this.db ??= await getDatabase();
  }

  /**
   * Ensure database connection is available
   */
  protected async ensureDatabase(): Promise<NonNullable<typeof this.db>> {
    if (!this.db) {
      await this.initializeDatabase();
    }
    if (!this.db) {
      throw new Error('Failed to initialize database connection');
    }
    return this.db;
  }

  /**
   * Abstract method to get logger from child classes
   */
  protected abstract getLogger(): ILogger;

  /**
   * Get where clause for record by ID
   */
  protected getByIdWhere(table: Record<string, unknown>, id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    return eq((table as any).id, id);
  }
}