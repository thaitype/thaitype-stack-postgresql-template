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
import { eq, and, ilike, inArray, SQL } from 'drizzle-orm';
import type { User } from '~/server/domain/models';
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

  async create(input: UserCreateRequest): Promise<User> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserCreateSchema.parse(input);

      this.getLogger().info(
        'Creating user record',
        {
          operation: 'create',
          entityName: this.entityName,
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
        }
      );

      return this.mapToUser(created);
    } catch (error) {
      this.getLogger().error(
        'Failed to create user record',
        {
          operation: 'create',
          entityName: this.entityName,
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

  async delete(id: string): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      this.getLogger().info(
        'Deleting user record',
        {
          operation: 'delete',
          entityName: this.entityName,
          id,
        }
      );

      await db.delete(users).where(eq(users.id, id));

      this.getLogger().info(
        'User record deleted successfully',
        {
          operation: 'delete',
          entityName: this.entityName,
          id,
        }
      );
    } catch (error) {
      this.getLogger().error(
        'Failed to delete user record',
        {
          operation: 'delete',
          entityName: this.entityName,
          id,
          error: (error as Error).message,
        }
      );
      throw error;
    }
  }

  // =============================================================================
  // DEDICATED UPDATE METHODS
  // =============================================================================

  async updateBasicInfo(id: string, input: UserBasicInfoPartialUpdate): Promise<void> {
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
        }
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        'User basic info updated successfully',
        {
          operation: 'updateBasicInfo',
          entityName: this.entityName,
          id,
        }
      );
    } catch (error) {
      this.getLogger().error(
        'Failed to update user basic info',
        {
          operation: 'updateBasicInfo',
          entityName: this.entityName,
          id,
          error: (error as Error).message,
        }
      );
      throw error;
    }
  }

  async updateRoles(id: string, input: UserRolesUpdate): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserRolesUpdateSchema.parse(input);

      this.getLogger().info(
        'Updating user roles',
        {
          operation: 'updateRoles',
          entityName: this.entityName,
          id,
        }
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        'User roles updated successfully',
        {
          operation: 'updateRoles',
          entityName: this.entityName,
          id,
        }
      );
    } catch (error) {
      this.getLogger().error(
        'Failed to update user roles',
        {
          operation: 'updateRoles',
          entityName: this.entityName,
          id,
          error: (error as Error).message,
        }
      );
      throw error;
    }
  }

  async updateEmail(id: string, input: UserEmailUpdate): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserEmailUpdateSchema.parse(input);

      this.getLogger().info(
        'Updating user email',
        {
          operation: 'updateEmail',
          entityName: this.entityName,
          id,
        }
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        'User email updated successfully',
        {
          operation: 'updateEmail',
          entityName: this.entityName,
          id,
        }
      );
    } catch (error) {
      this.getLogger().error(
        'Failed to update user email',
        {
          operation: 'updateEmail',
          entityName: this.entityName,
          id,
          error: (error as Error).message,
        }
      );
      throw error;
    }
  }

  async updateStatus(id: string, input: UserStatusUpdate): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserStatusUpdateSchema.parse(input);

      this.getLogger().info(
        'Updating user status',
        {
          operation: 'updateStatus',
          entityName: this.entityName,
          id,
        }
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        'User status updated successfully',
        {
          operation: 'updateStatus',
          entityName: this.entityName,
          id,
        }
      );
    } catch (error) {
      this.getLogger().error(
        'Failed to update user status',
        {
          operation: 'updateStatus',
          entityName: this.entityName,
          id,
          error: (error as Error).message,
        }
      );
      throw error;
    }
  }

  async updateProfile(id: string, input: UserProfilePartialUpdate): Promise<User | null> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserProfileUpdateSchema.parse(input);

      this.getLogger().info(
        'Updating user profile',
        {
          operation: 'updateProfile',
          entityName: this.entityName,
          id,
        }
      );

      const [updated] = await db.update(users).set(validatedData).where(eq(users.id, id)).returning();

      if (!updated) {
        this.getLogger().info(
          'User not found for profile update',
          {
            operation: 'updateProfile',
            entityName: this.entityName,
            id,
          }
        );
        return null;
      }

      this.getLogger().info(
        'User profile updated successfully',
        {
          operation: 'updateProfile',
          entityName: this.entityName,
          id,
        }
      );

      return this.mapToUser(updated);
    } catch (error) {
      this.getLogger().error(
        'Failed to update user profile',
        {
          operation: 'updateProfile',
          entityName: this.entityName,
          id,
          error: (error as Error).message,
        }
      );
      throw error;
    }
  }

  async updateName(id: string, input: UserNameUpdate): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserNameUpdateSchema.parse(input);

      this.getLogger().info(
        'Updating user name',
        {
          operation: 'updateName',
          entityName: this.entityName,
          id,
        }
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        'User name updated successfully',
        {
          operation: 'updateName',
          entityName: this.entityName,
          id,
        }
      );
    } catch (error) {
      this.getLogger().error(
        'Failed to update user name',
        {
          operation: 'updateName',
          entityName: this.entityName,
          id,
          error: (error as Error).message,
        }
      );
      throw error;
    }
  }

  async updateBio(id: string, input: UserBioUpdate): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserBioUpdateSchema.parse(input);

      this.getLogger().info(
        'Updating user bio',
        {
          operation: 'updateBio',
          entityName: this.entityName,
          id,
        }
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        'User bio updated successfully',
        {
          operation: 'updateBio',
          entityName: this.entityName,
          id,
        }
      );
    } catch (error) {
      this.getLogger().error(
        'Failed to update user bio',
        {
          operation: 'updateBio',
          entityName: this.entityName,
          id,
          error: (error as Error).message,
        }
      );
      throw error;
    }
  }

  async updateAvatar(id: string, input: UserAvatarUpdate): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserAvatarUpdateSchema.parse(input);

      this.getLogger().info(
        'Updating user avatar',
        {
          operation: 'updateAvatar',
          entityName: this.entityName,
          id,
        }
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        'User avatar updated successfully',
        {
          operation: 'updateAvatar',
          entityName: this.entityName,
          id,
        }
      );
    } catch (error) {
      this.getLogger().error(
        'Failed to update user avatar',
        {
          operation: 'updateAvatar',
          entityName: this.entityName,
          id,
          error: (error as Error).message,
        }
      );
      throw error;
    }
  }

  async updateWebsite(id: string, input: UserWebsiteUpdate): Promise<void> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = RepoUserWebsiteUpdateSchema.parse(input);

      this.getLogger().info(
        'Updating user website',
        {
          operation: 'updateWebsite',
          entityName: this.entityName,
          id,
        }
      );

      await db.update(users).set(validatedData).where(eq(users.id, id));

      this.getLogger().info(
        'User website updated successfully',
        {
          operation: 'updateWebsite',
          entityName: this.entityName,
          id,
        }
      );
    } catch (error) {
      this.getLogger().error(
        'Failed to update user website',
        {
          operation: 'updateWebsite',
          entityName: this.entityName,
          id,
          error: (error as Error).message,
        }
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
        'Finding user by email',
        {
          operation: 'findByEmail',
          entityName: this.entityName,
          email,
        }
      );

      const [user] = await db.select().from(users).where(eq(users.email, email));

      if (!user) {
        this.getLogger().info(
          'User not found by email',
          {
            operation: 'findByEmail',
            entityName: this.entityName,
            email,
          }
        );
        return null;
      }

      return this.mapToUser(user);
    } catch (error) {
      this.getLogger().error(
        'Failed to find user by email',
        {
          operation: 'findByEmail',
          entityName: this.entityName,
          email,
          error: (error as Error).message,
        }
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
        'Finding all users with filter',
        {
          operation: 'findAll',
          entityName: this.entityName,
          filter,
          options,
        }
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
        query = query.where(and(...conditions)) as typeof query;
      }

      // Apply pagination
      if (options?.skip) {
        query = query.offset(options.skip) as typeof query;
      }
      if (options?.limit) {
        query = query.limit(options.limit) as typeof query;
      }

      const results = await query;

      this.getLogger().info(
        'Users found successfully',
        {
          operation: 'findAll',
          entityName: this.entityName,
          count: results.length,
        }
      );

      return results.map(user => this.mapToUser(user));
    } catch (error) {
      this.getLogger().error(
        'Failed to find users',
        {
          operation: 'findAll',
          entityName: this.entityName,
          filter,
          options,
          error: (error as Error).message,
        }
      );
      throw error;
    }
  }

  async count(filter?: Partial<User>): Promise<number> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      this.getLogger().info(
        'Counting users with filter',
        {
          operation: 'count',
          entityName: this.entityName,
          filter,
        }
      );

      let query = db.select({ count: users.id }).from(users)

      // Apply filters
      const conditions: SQL[] = [];
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
        query = query.where(and(...conditions)) as typeof query;
      }

      const [result] = await query;
      const count = Number(result?.count) || 0;

      this.getLogger().info(
        'Users counted successfully',
        {
          operation: 'count',
          entityName: this.entityName,
          count,
        }
      );

      return count;
    } catch (error) {
      this.getLogger().error(
        'Failed to count users',
        {
          operation: 'count',
          entityName: this.entityName,
          filter,
          error: (error as Error).message,
        }
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