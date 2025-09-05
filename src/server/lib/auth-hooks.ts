import { MonguardCollection, type UserContext } from 'monguard';
import { getDatabase } from './db';
import type { DbUserEntity } from '../infrastructure/entities/index';
import { ObjectId } from 'mongodb';

/**
 * Better Auth user object interface
 * This represents the user object as passed from Better Auth hooks
 */
interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  roles?: ('admin')[];
  bio?: string;
  avatar?: string;
  website?: string;
  isActive?: boolean;
  // Include timestamp fields that Better Auth may provide
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Update data interface for user updates
 */
interface BetterAuthUserUpdate {
  email?: string;
  name?: string;
  roles?: ('admin')[];
  bio?: string;
  avatar?: string;
  website?: string;
  isActive?: boolean;
}

/**
 * Monguard collection instance for user auto-field management
 */
let userMonguardCollection: MonguardCollection<DbUserEntity> | null = null;

/**
 * Get or create Monguard collection for user management
 */
async function getUserMonguardCollection(): Promise<MonguardCollection<DbUserEntity>> {
  if (!userMonguardCollection) {
    const db = await getDatabase();
    userMonguardCollection = new MonguardCollection<DbUserEntity>(db, 'user', {
      concurrency: { transactionsEnabled: false },
      autoFieldControl: {
        enableAutoTimestamps: true,
        enableAutoUserTracking: true,
      },
      auditControl: {
        enableAutoAudit: false, // Manual audit control via hooks
        auditCustomOperations: true,
      },
    });
  }
  return userMonguardCollection;
}

/**
 * Create user context from user ID
 */
function createUserContext(userId: string): UserContext {
  return { userId };
}

/**
 * Handle user creation - called by Better Auth hooks
 * Applies Monguard auto-fields for user creation
 */
export async function handleUserCreate(user: BetterAuthUser): Promise<BetterAuthUser> {
  try {
    console.log(`[Auth Hook] Processing user creation for: ${user.id}`);
    
    const collection = await getUserMonguardCollection();
    
    // Create user context from the created user's ID
    const userContext = createUserContext(user.id);
    
    // Apply Monguard auto-fields for creation
    const updatedUser = collection.updateAutoFields(
      { ...user },
      {
        operation: 'create',
        userContext,
      }
    ) as BetterAuthUser;

    // Create audit log for user creation
    // await collection.createAuditLog(
    //   'create',
    //   new ObjectId(user.id),
    //   userContext,
    //   {
    //     afterDocument: updatedUser,
    //     customData: {
    //       source: 'better_auth',
    //       operation: 'user_registration',
    //       timestamp: new Date(),
    //     },
    //   }
    // );

    console.log(`[Auth Hook] User created successfully with auto-fields: ${user.id}`);
    return updatedUser;
  } catch (error) {
    console.error('[Auth Hook] Error in handleUserCreate:', error);
    console.error('[Auth Hook] User data:', user);
    // Don't throw error to prevent user creation from failing completely
    // Just log the error and return the original user
    console.log(`[Auth Hook] Continuing with user creation despite hook error: ${user.id}`);
    return user;
  }
}

/**
 * Handle user update - called by Better Auth hooks
 * Applies Monguard auto-fields for user updates
 */
export async function handleUserUpdate(user: BetterAuthUser, updatedData: BetterAuthUserUpdate): Promise<BetterAuthUser> {
  try {
    const collection = await getUserMonguardCollection();
    
    // Create user context - use the user performing the update
    const userContext = createUserContext(user.id);
    
    // Apply Monguard auto-fields for update
    const updatedUser = collection.updateAutoFields(
      { ...user, ...updatedData },
      {
        operation: 'update',
        userContext,
      }
    ) as BetterAuthUser;

    // Create audit log for user update
    // await collection.createAuditLog(
    //   'update',
    //   new ObjectId(user.id),
    //   userContext,
    //   {
    //     beforeDocument: user,
    //     afterDocument: updatedUser,
    //     customData: {
    //       source: 'better_auth',
    //       operation: 'user_update',
    //       timestamp: new Date(),
    //     },
    //   }
    // );

    console.log(`[Auth Hook] User updated with auto-fields: ${user.id}`);
    return updatedUser;
  } catch (error) {
    console.error('[Auth Hook] Error in handleUserUpdate:', error);
    throw error;
  }
}

/**
 * Handle user deletion - called by Better Auth hooks
 * Applies Monguard soft delete fields
 */
export async function handleUserDelete(user: BetterAuthUser, deletedBy?: string): Promise<BetterAuthUser> {
  try {
    const collection = await getUserMonguardCollection();
    
    // Create user context - use the user performing the deletion or system
    const userContext = createUserContext(deletedBy ?? 'system');
    
    // Apply Monguard soft delete fields
    const deletedUser = { ...user } as BetterAuthUser;
    collection.setDeletedFields(
      deletedUser,
      userContext,
      new Date()
    );

    // Create audit log for user deletion
    // await collection.createAuditLog(
    //   'delete',
    //   new ObjectId(user.id),
    //   userContext,
    //   {
    //     beforeDocument: user,
    //     afterDocument: deletedUser,
    //     customData: {
    //       source: 'better_auth',
    //       operation: 'user_deletion',
    //       timestamp: new Date(),
    //       softDelete: true,
    //     },
    //   }
    // );

    console.log(`[Auth Hook] User soft deleted with auto-fields: ${user.id}`);
    return deletedUser;
  } catch (error) {
    console.error('[Auth Hook] Error in handleUserDelete:', error);
    throw error;
  }
}

/**
 * Manual auto-field update for external operations
 * Useful when operations are performed outside Better Auth
 */
export async function updateUserAutoFields<D extends Record<string, unknown>>(
  document: D,
  operation: 'create' | 'update' | 'delete' | 'restore' | 'custom',
  userId?: string,
  customTimestamp?: Date
): Promise<D> {
  const collection = await getUserMonguardCollection();
  const userContext = userId ? createUserContext(userId) : undefined;
  
  return collection.updateAutoFields(document, {
    operation,
    userContext,
    customTimestamp,
  });
}

/**
 * Create manual audit log for user operations
 */
export async function createUserAuditLog(
  action: 'create' | 'update' | 'delete' | 'restore' | 'custom',
  userId: string,
  performedBy?: string,
  metadata?: {
    beforeDocument?: BetterAuthUser;
    afterDocument?: BetterAuthUser;
    customData?: Record<string, unknown>;
  }
): Promise<void> {
  const collection = await getUserMonguardCollection();
  const userContext = performedBy ? createUserContext(performedBy) : undefined;
  
  await collection.createAuditLog({
    action,
    documentId: new ObjectId(userId),
    userContext,
    metadata
  });
}

const authHooks = {
  handleUserCreate,
  handleUserUpdate,
  handleUserDelete,
  updateUserAutoFields,
  createUserAuditLog,
};

export default authHooks;