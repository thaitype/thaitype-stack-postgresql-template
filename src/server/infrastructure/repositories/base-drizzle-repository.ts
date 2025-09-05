import type { ILogger } from '@thaitype/core-utils';
import { eq } from 'drizzle-orm';
import * as Err from '~/server/lib/errors/domain-errors';
import { getDatabase } from '~/server/lib/db';
import type { BaseFields } from '../db/schema/base';

/**
 * Base Drizzle Repository Class
 * Simple CRUD operations without audit logging
 */
export abstract class BaseDrizzleRepository<TEntity extends BaseFields> {
  protected db?: Awaited<ReturnType<typeof getDatabase>>;
  protected entityName: string;

  constructor(entityName: string) {
    this.entityName = entityName;
  }

  /**
   * Initialize database connection
   */
  protected async initializeDatabase(): Promise<void> {
    if (!this.db) {
      this.db = await getDatabase();
    }
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
  protected getByIdWhere<T extends { id: any }>(table: T, id: string): any {
    return eq(table.id, id);
  }
}