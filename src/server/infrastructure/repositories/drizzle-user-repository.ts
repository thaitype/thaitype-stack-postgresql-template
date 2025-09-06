/**
 * Drizzle User Repository Implementation
 * 
 * This implementation follows the Entity-Based Repository Architecture:
 * 1. Service layer database independence (no Drizzle types exposed to services)
 * 2. Repository handles all database-specific operations
 * 3. Uses dedicated methods over generic operations
 * 4. Type-safe with entity-derived types
 */

import type { ILogger } from '@thaitype/core-utils';
import { eq, and, ilike, inArray } from 'drizzle-orm';
import type { User } from '~/server/domain/models';
import type { RepositoryContext } from '~/server/lib/constants';
import type { IUserRepository } from '~/server/domain/repositories/user-repository';
import type {
  UserCreateRequest,
  UserBasicInfoPartialUpdate,
  UserRolesUpdate,
  UserEmailUpdate,
  UserStatusUpdate,
  UserProfilePartialUpdate,
  UserNameUpdate,
  UserBioUpdate,
  UserAvatarUpdate,
  UserWebsiteUpdate,
} from '~/server/domain/repositories/types/user-repository-types';
import { BaseDrizzleRepository } from './base-drizzle-repository';
import { users } from '../db/schema';
import type { DbUserEntity } from '../entities';
import {
  RepoUserCreateSchema,
  RepoUserBasicInfoUpdateSchema,
  RepoUserRolesUpdateSchema,
  RepoUserEmailUpdateSchema,
  RepoUserStatusUpdateSchema,
  RepoUserProfileUpdateSchema,
  RepoUserNameUpdateSchema,
  RepoUserBioUpdateSchema,
  RepoUserAvatarUpdateSchema,
  RepoUserWebsiteUpdateSchema,
} from '~/server/domain/repositories/schemas/user-repository-schemas';
import * as Err from '~/server/lib/errors/domain-errors';

/**
 * Drizzle implementation of User Repository
 */
export class DrizzleUserRepository extends BaseDrizzleRepository<DbUserEntity> implements IUserRepository {
  
  constructor() {
    super('User');
  }

  protected getLogger(): ILogger {
    // Flexible logger that handles both parameter orders for migration compatibility
    const logFn = (level: string) => (messageOrMeta: string | Record<string, unknown>, metaOrMessage?: Record<string, unknown> | string) => {
      if (typeof messageOrMeta === 'string') {
        // Standard order: message, metadata
        console.log(`[${level.toUpperCase()}]`, messageOrMeta, metaOrMessage);
      } else {
        // Legacy order: metadata, message - swap them
        console.log(`[${level.toUpperCase()}]`, metaOrMessage, messageOrMeta);
      }
    };

    return {
      info: logFn('info'),
      warn: logFn('warn'), 
      error: logFn('error'),
      debug: logFn('debug'),
      log: logFn('log'),
      logWithLevel: (level: 'error' | 'warn' | 'info' | 'debug', message: string, meta?: Record<string, unknown>) => console.log(`[${level.toUpperCase()}]`, message, meta),
      level: 'info'
    };
  }

  // =============================================================================
  // BASIC CRUD OPERATIONS
  // =============================================================================

  async create(input: UserCreateRequest, context: RepositoryContext): Promise<User> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserCreateSchema.parse(input);
      
      this.getLogger().info(
        'Creating user record',
        { 
          operation: 'create',
          entityName: this.entityName,
          operatedBy: context.operatedBy,
          email: validatedData.email,
        }
      );

      const [created] = await db.insert(users).values(validatedData).returning();
      
      if (!created) {
        throw new Err.DatabaseError('Failed to create user record');
      }

      this.getLogger().info(
        'User record created successfully',
        { 
          operation: 'create',
          entityName: this.entityName,
          id: created.id,
          operatedBy: context.operatedBy,
        }
      );

      return this.mapToUser(created);
    } catch (error) {
      this.getLogger().error(
        'Failed to create user record',
        { 
          operation: 'create',
          entityName: this.entityName,
          operatedBy: context.operatedBy,
          error: (error as Error).message,
        }
      );
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      this.getLogger().info(
        'Finding user by ID',
        { 
          operation: 'findById',
          entityName: this.entityName,
          id,
        }
      );

      const [user] = await db.select().from(users).where(eq(users.id, id));
      
      if (!user) {
        this.getLogger().info(
          'User not found',
          { 
            operation: 'findById',
            entityName: this.entityName,
            id,
          }
        );
        return null;
      }

      return this.mapToUser(user);
    } catch (error) {
      this.getLogger().error(
        'Failed to find user by ID',
        { 
          operation: 'findById',
          entityName: this.entityName,
          id,
          error: (error as Error).message,
        }
      );
      throw error;
    }
  }

  async delete(id: string, context: RepositoryContext): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      this.getLogger().info(
        'Deleting user record',
        { 
          operation: 'delete',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        }
      );

      await db.delete(users).where(eq(users.id, id));

      this.getLogger().info(
        'User record deleted successfully',
        { 
          operation: 'delete',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        }
      );
    } catch (error) {
      this.getLogger().error(
        'Failed to delete user record',
        { 
          operation: 'delete',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
          error: (error as Error).message,
        }
      );
      throw error;
    }
  }

  // =============================================================================
  // DEDICATED UPDATE METHODS
  // =============================================================================

  async updateBasicInfo(id: string, input: UserBasicInfoPartialUpdate, context: RepositoryContext): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserBasicInfoUpdateSchema.parse(input);
      
      this.getLogger().info(
        'Updating user basic info',
        { 
          operation: 'updateBasicInfo',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        }
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        'User basic info updated successfully',
        { 
          operation: 'updateBasicInfo',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        }
      );
    } catch (error) {
      this.getLogger().error(
        'Failed to update user basic info',
        { 
          operation: 'updateBasicInfo',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
          error: (error as Error).message,
        }
      );
      throw error;
    }
  }

  async updateRoles(id: string, input: UserRolesUpdate, context: RepositoryContext): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserRolesUpdateSchema.parse(input);
      
      this.getLogger().info(
        { 
          operation: 'updateRoles',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'Updating user roles'
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        { 
          operation: 'updateRoles',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'User roles updated successfully'
      );
    } catch (error) {
      this.getLogger().error(
        { 
          operation: 'updateRoles',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
          error: (error as Error).message,
        },
        'Failed to update user roles'
      );
      throw error;
    }
  }

  async updateEmail(id: string, input: UserEmailUpdate, context: RepositoryContext): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserEmailUpdateSchema.parse(input);
      
      this.getLogger().info(
        { 
          operation: 'updateEmail',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'Updating user email'
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        { 
          operation: 'updateEmail',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'User email updated successfully'
      );
    } catch (error) {
      this.getLogger().error(
        { 
          operation: 'updateEmail',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
          error: (error as Error).message,
        },
        'Failed to update user email'
      );
      throw error;
    }
  }

  async updateStatus(id: string, input: UserStatusUpdate, context: RepositoryContext): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserStatusUpdateSchema.parse(input);
      
      this.getLogger().info(
        { 
          operation: 'updateStatus',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'Updating user status'
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        { 
          operation: 'updateStatus',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'User status updated successfully'
      );
    } catch (error) {
      this.getLogger().error(
        { 
          operation: 'updateStatus',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
          error: (error as Error).message,
        },
        'Failed to update user status'
      );
      throw error;
    }
  }

  async updateProfile(id: string, input: UserProfilePartialUpdate, context: RepositoryContext): Promise<User | null> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserProfileUpdateSchema.parse(input);
      
      this.getLogger().info(
        { 
          operation: 'updateProfile',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'Updating user profile'
      );

      const [updated] = await db.update(users).set(validatedData).where(eq(users.id, id)).returning();

      if (!updated) {
        this.getLogger().info(
          { 
            operation: 'updateProfile',
            entityName: this.entityName,
            id,
            operatedBy: context.operatedBy,
          },
          'User not found for profile update'
        );
        return null;
      }

      this.getLogger().info(
        { 
          operation: 'updateProfile',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'User profile updated successfully'
      );

      return this.mapToUser(updated);
    } catch (error) {
      this.getLogger().error(
        { 
          operation: 'updateProfile',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
          error: (error as Error).message,
        },
        'Failed to update user profile'
      );
      throw error;
    }
  }

  async updateName(id: string, input: UserNameUpdate, context: RepositoryContext): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserNameUpdateSchema.parse(input);
      
      this.getLogger().info(
        { 
          operation: 'updateName',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'Updating user name'
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        { 
          operation: 'updateName',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'User name updated successfully'
      );
    } catch (error) {
      this.getLogger().error(
        { 
          operation: 'updateName',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
          error: (error as Error).message,
        },
        'Failed to update user name'
      );
      throw error;
    }
  }

  async updateBio(id: string, input: UserBioUpdate, context: RepositoryContext): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserBioUpdateSchema.parse(input);
      
      this.getLogger().info(
        { 
          operation: 'updateBio',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'Updating user bio'
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        { 
          operation: 'updateBio',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'User bio updated successfully'
      );
    } catch (error) {
      this.getLogger().error(
        { 
          operation: 'updateBio',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
          error: (error as Error).message,
        },
        'Failed to update user bio'
      );
      throw error;
    }
  }

  async updateAvatar(id: string, input: UserAvatarUpdate, context: RepositoryContext): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserAvatarUpdateSchema.parse(input);
      
      this.getLogger().info(
        { 
          operation: 'updateAvatar',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'Updating user avatar'
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        { 
          operation: 'updateAvatar',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'User avatar updated successfully'
      );
    } catch (error) {
      this.getLogger().error(
        { 
          operation: 'updateAvatar',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
          error: (error as Error).message,
        },
        'Failed to update user avatar'
      );
      throw error;
    }
  }

  async updateWebsite(id: string, input: UserWebsiteUpdate, context: RepositoryContext): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserWebsiteUpdateSchema.parse(input);
      
      this.getLogger().info(
        { 
          operation: 'updateWebsite',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'Updating user website'
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        { 
          operation: 'updateWebsite',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
        },
        'User website updated successfully'
      );
    } catch (error) {
      this.getLogger().error(
        { 
          operation: 'updateWebsite',
          entityName: this.entityName,
          id,
          operatedBy: context.operatedBy,
          error: (error as Error).message,
        },
        'Failed to update user website'
      );
      throw error;
    }
  }

  // =============================================================================
  // QUERY OPERATIONS
  // =============================================================================

  async findByEmail(email: string): Promise<User | null> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      this.getLogger().info(
        { 
          operation: 'findByEmail',
          entityName: this.entityName,
          email,
        },
        'Finding user by email'
      );

      const [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (!user) {
        this.getLogger().info(
          { 
            operation: 'findByEmail',
            entityName: this.entityName,
            email,
          },
          'User not found by email'
        );
        return null;
      }

      return this.mapToUser(user);
    } catch (error) {
      this.getLogger().error(
        { 
          operation: 'findByEmail',
          entityName: this.entityName,
          email,
          error: (error as Error).message,
        },
        'Failed to find user by email'
      );
      throw error;
    }
  }

  async findAll(
    filter?: Partial<User>,
    options?: {
      limit?: number;
      skip?: number;
      sort?: Record<string, 1 | -1>;
    }
  ): Promise<User[]> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      this.getLogger().info(
        { 
          operation: 'findAll',
          entityName: this.entityName,
          filter,
          options,
        },
        'Finding all users with filter'
      );

      let query = db.select().from(users);

      // Apply filters
      const conditions = [];
      if (filter?.email) {
        conditions.push(ilike(users.email, `%${filter.email}%`));
      }
      if (filter?.isActive !== undefined) {
        conditions.push(eq(users.isActive, filter.isActive));
      }
      if (filter?.roles && filter.roles.length > 0) {
        // For array overlap, we need to check if any of the filter roles match
        conditions.push(inArray(users.roles, filter.roles));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply pagination
      if (options?.skip) {
        query = query.offset(options.skip);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const results = await query;

      this.getLogger().info(
        { 
          operation: 'findAll',
          entityName: this.entityName,
          count: results.length,
        },
        'Users found successfully'
      );

      return results.map(user => this.mapToUser(user));
    } catch (error) {
      this.getLogger().error(
        { 
          operation: 'findAll',
          entityName: this.entityName,
          filter,
          options,
          error: (error as Error).message,
        },
        'Failed to find users'
      );
      throw error;
    }
  }

  async count(filter?: Partial<User>): Promise<number> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      this.getLogger().info(
        { 
          operation: 'count',
          entityName: this.entityName,
          filter,
        },
        'Counting users with filter'
      );

      let query = db.select({ count: users.id }).from(users);

      // Apply filters
      const conditions = [];
      if (filter?.email) {
        conditions.push(ilike(users.email, `%${filter.email}%`));
      }
      if (filter?.isActive !== undefined) {
        conditions.push(eq(users.isActive, filter.isActive));
      }
      if (filter?.roles && filter.roles.length > 0) {
        conditions.push(inArray(users.roles, filter.roles));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const [result] = await query;
      const count = result?.count || 0;

      this.getLogger().info(
        { 
          operation: 'count',
          entityName: this.entityName,
          count,
        },
        'Users counted successfully'
      );

      return count;
    } catch (error) {
      this.getLogger().error(
        { 
          operation: 'count',
          entityName: this.entityName,
          filter,
          error: (error as Error).message,
        },
        'Failed to count users'
      );
      throw error;
    }
  }

  // =============================================================================
  // PRIVATE MAPPING METHODS
  // =============================================================================

  /**
   * Map database entity to domain model
   * Converts Drizzle entity to service-layer User type
   */
  private mapToUser(entity: DbUserEntity): User {
    return {
      id: entity.id,
      email: entity.email,
      name: entity.name,
      roles: entity.roles,
      bio: entity.bio,
      avatar: entity.avatar,
      website: entity.website,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}