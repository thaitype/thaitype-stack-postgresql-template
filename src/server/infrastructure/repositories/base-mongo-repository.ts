import type { ILogger } from '@thaitype/core-utils';
import type { Db, ObjectId } from 'mongodb';
import { MonguardCollection, type UserContext, type AuditableDocument, MonguardAuditLogger } from 'monguard';
import { SYSTEM_USER_CONTEXT, createUserContext, isValidObjectId, type RepositoryContext } from '~/server/lib/constants';
import * as Err from '~/server/lib/errors/domain-errors';

export interface BaseMongoRepositoryOptions {
  monguardOptions: {
    /**
     * @default false
     */
    enableAuditLogging: boolean; // Enable or disable audit logging
  }
}

export abstract class BaseMongoRepository<TEntity extends AuditableDocument> {
  protected collection: MonguardCollection<TEntity>;
  protected auditLogger: MonguardAuditLogger;

  constructor(db: Db, collectionName: string, options: BaseMongoRepositoryOptions) {
    const enableAuditLogging = options.monguardOptions.enableAuditLogging;

    this.auditLogger = new MonguardAuditLogger(db, 'audit_logs', {
      storageMode: 'delta',        // Enable delta mode
      maxDepth: 3,                 // Track nested changes up to 3 levels
      arrayDiffMaxSize: 20,        // Smart array handling
    });
    this.collection = new MonguardCollection<TEntity>(db, collectionName, {
      concurrency: { transactionsEnabled: false },
      auditLogger: enableAuditLogging ? this.auditLogger : undefined,
      logger: {
        error: (message, context) => {
          this.getLogger().error(message, {
            operation: 'BaseMongoRepository',
            collection: collectionName,
            ...(context as Record<string, unknown>)
          });
        },
        warn: (message, context) => {
          this.getLogger().warn(message, {
            operation: 'BaseMongoRepository',
            collection: collectionName,
            ...(context as Record<string, unknown>)
          });
        }
      }
    });

  }

  // Abstract method to get logger from child classes
  protected abstract getLogger(): ILogger;

  /**
   * Resolve RepositoryContext to UserContext for monguard operations
   * 
   * This is the primary method for converting repository context to the format
   * expected by monguard for audit trail tracking.
   */
  protected resolveUserContext(context: RepositoryContext): UserContext<ObjectId> {
    const userId = context?.operatedBy;

    if (userId) {
      // Validate user ID format
      if (!isValidObjectId(userId)) {
        throw new Err.ValidationError(`Invalid user ID format: ${userId}. Expected 24-character hex string.`, {
          userId,
          expectedFormat: '24-character hex string'
        });
      }
      return createUserContext(userId);
    }

    // Log warning when falling back to system context
    this.getLogger().warn('Using system user context as fallback', {
      operation: 'resolveUserContext',
      reason: 'no_user_provided',
      recommendation: 'Consider passing authenticated user in RepositoryContext'
    });
    return SYSTEM_USER_CONTEXT;
  }

  /**
   * Get system user context for system operations only
   * Use this only for legitimate system operations like migrations, cleanup, etc.
   * 
   * @deprecated Use resolveUserContext with createSystemRepositoryContext() instead
   */
  protected getSystemUserContext(): UserContext<ObjectId> {
    return SYSTEM_USER_CONTEXT;
  }

  /**
   * Create user context from authenticated user ID
   * Use this for all user-initiated operations
   * 
   * @deprecated Use resolveUserContext with createRepositoryContext() instead
   */
  protected createUserContext(userId: string): UserContext<ObjectId> {
    if (!isValidObjectId(userId)) {
      throw new Err.ValidationError(`Invalid user ID format: ${userId}. Expected 24-character hex string.`, {
        userId,
        expectedFormat: '24-character hex string'
      });
    }
    return createUserContext(userId);
  }

  /**
   * Get user context with fallback to system context
   * WARNING: Only use when user context is truly unavailable
   * 
   * @deprecated Use resolveUserContext with RepositoryContext instead
   */
  protected getUserContextWithFallback(userId?: string): UserContext<ObjectId> {
    if (userId) {
      return this.createUserContext(userId);
    }

    // Log warning when falling back to system context
    this.getLogger().warn('Using system user context as fallback', {
      operation: 'getUserContextWithFallback',
      reason: 'no_user_id_provided',
      recommendation: 'Consider passing authenticated user ID'
    });
    return this.getSystemUserContext();
  }
}