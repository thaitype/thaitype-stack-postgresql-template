/**
 * System-wide constants for the Academy API
 */
import { ObjectId } from 'mongodb';

/**
 * System User ID - represents the system account for automated operations
 * 
 * Uses a special ObjectId with all zeros to represent the root system account.
 * This maintains consistency with ObjectId format used throughout the system
 * while clearly identifying system-initiated operations in audit trails.
 * 
 * Usage:
 * - Database migrations
 * - Automated cleanup tasks  
 * - System-initiated data corrections
 * - Background job operations
 * 
 * DO NOT USE for user-initiated operations - always use the authenticated user's ID
 */
export const SYSTEM_USER_ID = '000000000000000000000000';

/**
 * Repository operation context for tracking who performed database operations
 * 
 * This type ensures consistent user attribution across all repository operations
 * while providing type safety and clear documentation of user context requirements.
 */
export interface RepositoryContext {
  /**
   * ID of the user performing the operation
   * 
   * - For user-initiated operations: Pass the authenticated user's ID
   * - For system operations: Use SYSTEM_USER_ID or omit (will fallback to system)
   * - Must be a valid 24-character hex ObjectId
   */
  operatedBy?: string;
  
  /**
   * Optional additional context for the operation
   * Can be used for logging, audit trails, or debugging
   */
  metadata?: Record<string, unknown>;
}

/**
 * Helper to create system user context for monguard operations
 */
export const SYSTEM_USER_CONTEXT = {
  userId: new ObjectId(SYSTEM_USER_ID),
} as const;

/**
 * Helper to create user context for monguard operations
 */
export function createUserContext(userId: string) {
  return {
    userId: new ObjectId(userId),
  };
}

/**
 * Helper to create repository context from authenticated user
 */
export function createRepositoryContext(operatedBy: string, metadata?: Record<string, unknown>): RepositoryContext {
  return {
    operatedBy,
    metadata,
  };
}

/**
 * Helper to create system repository context for system operations
 */
export function createSystemRepositoryContext(metadata?: Record<string, unknown>): RepositoryContext {
  return {
    operatedBy: SYSTEM_USER_ID,
    metadata,
  };
}

/**
 * Validate that a user ID is a valid ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Check if a user ID represents the system account
 */
export function isSystemUser(userId: string): boolean {
  return userId === SYSTEM_USER_ID;
}

/**
 * Order session timeout duration in minutes
 * 
 * Orders accessed via session ID (e.g., payment success page) are considered
 * expired after this duration from their creation time. This prevents:
 * - Excessive server calls for old pending orders
 * - Indefinite access to old order sessions
 * - Resource waste from continuous polling
 * 
 * After timeout, users must create a new order to continue the payment process.
 */
export const ORDER_SESSION_TIMEOUT_MINUTES = 60;