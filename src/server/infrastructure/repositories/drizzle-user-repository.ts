/**
 * Drizzle User Repository Implementation
 * 
 * This implementation follows the Entity-Based Repository Architecture:
 * 1. Service layer database independence (no Drizzle types exposed to services)
 * 2. Repository handles all database-specific operations
 * 3. Uses dedicated methods over generic operations
 * 4. Type-safe with entity-derived types
 */

import type { AppContext } from '~/server/context/app-context';
import { eq, and, ilike, inArray, type SQL, sql } from 'drizzle-orm';
import type { User } from '~/server/domain/models';
import type { IUserRepository } from '~/server/domain/repositories/user-repository';
import type {
  UserBasicInfoPartialUpdate,
  UserRolesUpdate,
  UserEmailUpdate,
  UserProfilePartialUpdate,
  UserNameUpdate,
  UserBioUpdate,
  UserAvatarUpdate,
  UserWebsiteUpdate,
} from '~/server/domain/repositories/types/user-repository-types';
import { BaseDrizzleRepository } from './base-drizzle-repository';
import { users, roles, userRoles } from '../db/schema';
import type { DbUserEntity } from '../entities';
import {
  RepoUserBasicInfoUpdateSchema,
  RepoUserRolesUpdateSchema,
  RepoUserEmailUpdateSchema,
  RepoUserProfileUpdateSchema,
  RepoUserNameUpdateSchema,
  RepoUserBioUpdateSchema,
  RepoUserAvatarUpdateSchema,
  RepoUserWebsiteUpdateSchema,
} from '~/server/domain/repositories/schemas/user-repository-schemas';

/**
 * Drizzle implementation of User Repository
 */
export class DrizzleUserRepository extends BaseDrizzleRepository implements IUserRepository {

  constructor(private appContext: AppContext) {
    super('User');
  }

  protected getLogger() {
    return this.appContext.logger;
  }

  // =============================================================================
  // BASIC CRUD OPERATIONS
  // =============================================================================

  async create(): Promise<User> {
    // Use Better Auth API to create user instead of direct database insert
    // This should delegate to Better Auth's signUp API
    throw new Error('User creation should be handled via Better Auth API, not direct repository insert');
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

      // Get user with aggregated roles via JOIN
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          bio: users.bio,
          avatar: users.avatar,
          website: users.website,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          roles: sql<string[]>`array_agg(${roles.name}) filter (where ${roles.name} is not null)`,
        })
        .from(users)
        .leftJoin(userRoles, eq(users.id, userRoles.userId))
        .leftJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(users.id, id))
        .groupBy(users.id)
        .limit(1);

      const user = result[0];

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

      return this.mapToUserWithRoles(user);
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
        'Updating user roles via normalized tables',
        {
          operation: 'updateRoles',
          entityName: this.entityName,
          id,
        }
      );

      // Convert role names to IDs
      const roleResults = await db
        .select({ id: roles.id })
        .from(roles)
        .where(inArray(roles.name, validatedData.roles));

      if (roleResults.length !== validatedData.roles.length) {
        throw new Error('Some roles not found');
      }

      const roleIds = roleResults.map(r => r.id);

      // Use transaction to ensure atomicity
      await db.transaction(async (tx) => {
        // Remove all existing roles for this user
        await tx.delete(userRoles).where(eq(userRoles.userId, id));

        // Add new roles if any
        if (roleIds.length > 0) {
          await tx.insert(userRoles).values(
            roleIds.map(roleId => ({
              userId: id,
              roleId,
            }))
          );
        }
      });

      this.getLogger().info(
        'User roles updated successfully via normalized tables',
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

      // Get user with aggregated roles via JOIN
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          bio: users.bio,
          avatar: users.avatar,
          website: users.website,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          roles: sql<string[]>`array_agg(${roles.name}) filter (where ${roles.name} is not null)`,
        })
        .from(users)
        .leftJoin(userRoles, eq(users.id, userRoles.userId))
        .leftJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(users.email, email))
        .groupBy(users.id)
        .limit(1);

      const user = result[0];

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

      return this.mapToUserWithRoles(user);
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

      // Base query with role aggregation
      let query = db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          bio: users.bio,
          avatar: users.avatar,
          website: users.website,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          roles: sql<string[]>`array_agg(${roles.name}) filter (where ${roles.name} is not null)`,
        })
        .from(users)
        .leftJoin(userRoles, eq(users.id, userRoles.userId))
        .leftJoin(roles, eq(userRoles.roleId, roles.id));

      // Apply filters
      const conditions = [];
      if (filter?.email) {
        conditions.push(ilike(users.email, `%${filter.email}%`));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      // Group by user to aggregate roles
      query = query.groupBy(users.id) as typeof query;

      // Handle role filtering with HAVING clause after grouping
      if (filter?.roles && filter.roles.length > 0) {
        query = query.having(
          sql`array_agg(${roles.name}) && ${filter.roles}`
        ) as typeof query;
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

      return results.map(user => this.mapToUserWithRoles(user));
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

      // For counting with role filters, we need to use a subquery
      if (filter?.roles && filter.roles.length > 0) {
        const subquery = db
          .selectDistinct({ userId: userRoles.userId })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(inArray(roles.name, filter.roles));

        // Apply filters
        const conditions: SQL[] = [inArray(users.id, subquery)];
        if (filter?.email) {
          conditions.push(ilike(users.email, `%${filter.email}%`));
        }

        const query = db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(and(...conditions));

        const [result] = await query;
        const count = Number(result?.count) || 0;

        this.getLogger().info(
          'Users counted successfully with role filter',
          {
            operation: 'count',
            entityName: this.entityName,
            count,
          }
        );

        return count;
      } else {
        // Simple count without role filtering
        let query = db.select({ count: sql<number>`count(*)` }).from(users);

        const conditions: SQL[] = [];
        if (filter?.email) {
          conditions.push(ilike(users.email, `%${filter.email}%`));
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
      }
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
      roles: [], // Roles removed from user table, will be empty
      bio: entity.bio,
      avatar: entity.avatar,
      website: entity.website,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Map joined query result with aggregated roles to domain model
   */
  private mapToUserWithRoles(result: {
    id: string;
    email: string;
    name: string;
    bio: string | null;
    avatar: string | null;
    website: string | null;
    createdAt: Date;
    updatedAt: Date;
    roles: string[] | null;
  }): User {
    return {
      id: result.id,
      email: result.email,
      name: result.name,
      roles: result.roles ?? [], // Handle null case when user has no roles
      bio: result.bio,
      avatar: result.avatar,
      website: result.website,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }
}