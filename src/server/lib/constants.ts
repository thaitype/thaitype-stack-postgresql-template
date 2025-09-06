/**
 * System-wide constants for the Todo App API
 */

/**
 * Default pagination limit for database queries
 */
export const DEFAULT_PAGE_LIMIT = 20;

/**
 * Maximum pagination limit for database queries
 */
export const MAX_PAGE_LIMIT = 100;

/**
 * System user ID for internal operations
 */
export const SYSTEM_USER_ID = 'system';

/**
 * Repository operation context
 * Provides audit information for database operations
 */
export interface RepositoryContext {
  operatedBy: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}