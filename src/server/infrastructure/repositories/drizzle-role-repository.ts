/**
 * Drizzle Role Repository Implementation - Entity-Based Architecture
 * 
 * Implements role repository interface using Drizzle ORM with PostgreSQL.
 * Handles string-to-UUID conversion and database-specific operations.
 * Follows the single source of truth principle from database entities.
 */

import { and, eq, inArray, sql } from 'drizzle-orm';
import { BaseDrizzleRepository } from './base-drizzle-repository';
import type { IRoleRepository } from '~/server/domain/repositories/role-repository';
import type { Role } from '~/server/infrastructure/db/schema';
import type { AppContext } from '~/server/context/app-context';
import {
  roles,
  userRoles,
  type DbRoleEntity,
} from '~/server/infrastructure/db/schema';
import {
  type RoleCreateRequest,
  type RoleBasicInfoUpdate,
  type RoleBasicInfoPartialUpdate,
  type RoleNameUpdate,
  type RoleDescriptionUpdate,
  type UserRoleAssignData,
  type UserRolesBulkUpdate,
  type UserRolesSetData,
  type RoleFilterQuery,
  type UserRoleFilterQuery,
} from '~/server/domain/repositories/types/role-repository-types';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '~/server/lib/errors/domain-errors';

/**
 * Zod schemas for runtime validation with automatic string-to-UUID conversion
 */
const roleIdSchema = z.string().uuid('Invalid role ID format');
const userIdSchema = z.string().uuid('Invalid user ID format');
const roleNamesSchema = z.array(z.string().min(1)).min(1, 'Role names array cannot be empty');

/**
 * Schema validation for repository input types
 */
const roleCreateSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().nullable(),
}) satisfies z.ZodType<RoleCreateRequest>;

const roleBasicInfoUpdateSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().nullable(),
}) satisfies z.ZodType<RoleBasicInfoUpdate>;

const userRolesSetSchema = z.object({
  userId: userIdSchema,
  roleNames: roleNamesSchema,
}) satisfies z.ZodType<UserRolesSetData>;

export class DrizzleRoleRepository extends BaseDrizzleRepository implements IRoleRepository {
  constructor(private appContext: AppContext) {
    super('Role');
  }

  protected getLogger() {
    return this.appContext.logger;
  }

  // =============================================================================
  // ROLE CRUD OPERATIONS
  // =============================================================================

  async create(data: RoleCreateRequest): Promise<Role> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const validatedData = roleCreateSchema.parse(data);

      const result = await db
        .insert(roles)
        .values(validatedData)
        .returning();

      const role = result[0];
      if (!role) {
        throw new ValidationError('Failed to create role');
      }

      this.getLogger().info('Role created successfully', {
        roleId: role.id,
        roleName: role.name,
        operation: 'create',
        entityName: this.entityName,
      });

      return this.mapDbEntityToDomain(role);
    } catch (error) {
      this.getLogger().error('Failed to create role', {
        error: error instanceof Error ? error.message : String(error),
        data,
        operation: 'create',
        entityName: this.entityName,
      });
      throw error;
    }
  }

  async findById(id: string): Promise<Role | null> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const roleId = roleIdSchema.parse(id);

      const result = await db
        .select()
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1);

      const role = result[0];
      return role ? this.mapDbEntityToDomain(role) : null;
    } catch (error) {
      this.getLogger().error('Failed to find role by ID', {
        error: error instanceof Error ? error.message : String(error),
        roleId: id,
        operation: 'findById',
        entityName: this.entityName,
      });
      throw error;
    }
  }

  async findByName(name: string): Promise<Role | null> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const result = await db
        .select()
        .from(roles)
        .where(eq(roles.name, name))
        .limit(1);

      const role = result[0];
      return role ? this.mapDbEntityToDomain(role) : null;
    } catch (error) {
      this.getLogger().error('Failed to find role by name', { error: error instanceof Error ? error.message : String(error), roleName: name });
      throw error;
    }
  }

  async findByNames(names: string[]): Promise<Role[]> {
    try {
      const validatedNames = roleNamesSchema.parse(names);

      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const result = await db
        .select()
        .from(roles)
        .where(inArray(roles.name, validatedNames));

      return result.map((role) => this.mapDbEntityToDomain(role));
    } catch (error) {
      this.getLogger().error('Failed to find roles by names', { error: error instanceof Error ? error.message : String(error), roleNames: names });
      throw error;
    }
  }

  async findAll(filter?: RoleFilterQuery): Promise<Role[]> {
    try {
      await this.initializeDatabase();
      const db = await this.ensureDatabase();
      
      let query = db.select().from(roles);

      if (filter) {
        const conditions = [];

        if (filter.name) {
          conditions.push(eq(roles.name, filter.name));
        }

        if (filter.names?.length) {
          const validatedNames = roleNamesSchema.parse(filter.names);
          conditions.push(inArray(roles.name, validatedNames));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }
      }

      const result = await query;
      return result.map((role) => this.mapDbEntityToDomain(role));
    } catch (error) {
      this.getLogger().error('Failed to find all roles', { error: error instanceof Error ? error.message : String(error), filter });
      throw error;
    }
  }

  async updateBasicInfo(
    id: string,
    data: RoleBasicInfoUpdate
  ): Promise<Role> {
    try {
      const roleId = roleIdSchema.parse(id);
      const validatedData = roleBasicInfoUpdateSchema.parse(data);

      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const result = await db
        .update(roles)
        .set(validatedData)
        .where(eq(roles.id, roleId))
        .returning();

      const role = result[0];
      if (!role) {
        throw new NotFoundError('Role not found or update failed');
      }

      this.getLogger().info('Role basic info updated successfully', { roleId: role.id });

      return this.mapDbEntityToDomain(role);
    } catch (error) {
      this.getLogger().error('Failed to update role basic info', { error: error instanceof Error ? error.message : String(error), roleId: id, data });
      throw error;
    }
  }

  async updateBasicInfoPartial(
    id: string,
    data: RoleBasicInfoPartialUpdate
  ): Promise<Role> {
    try {
      const roleId = roleIdSchema.parse(id);

      const updateData: Partial<DbRoleEntity> = {};

      if (data.name !== undefined) {
        updateData.name = data.name;
      }
      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const result = await db
        .update(roles)
        .set(updateData)
        .where(eq(roles.id, roleId))
        .returning();

      const role = result[0];
      if (!role) {
        throw new NotFoundError('Role not found or update failed');
      }

      this.getLogger().info('Role basic info updated partially', { roleId: role.id });

      return this.mapDbEntityToDomain(role);
    } catch (error) {
      this.getLogger().error('Failed to partially update role basic info', { error: error instanceof Error ? error.message : String(error), roleId: id, data });
      throw error;
    }
  }

  async updateName(id: string, data: RoleNameUpdate): Promise<Role> {
    return this.updateBasicInfoPartial(id, { name: data.name });
  }

  async updateDescription(
    id: string,
    data: RoleDescriptionUpdate
  ): Promise<Role> {
    return this.updateBasicInfoPartial(id, { description: data.description });
  }

  async deleteById(id: string): Promise<void> {
    try {
      const roleId = roleIdSchema.parse(id);

      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const result = await db.delete(roles).where(eq(roles.id, roleId)).returning();

      if (!result[0]) {
        throw new NotFoundError('Role not found');
      }

      this.getLogger().info('Role deleted successfully', { roleId });
    } catch (error) {
      this.getLogger().error('Failed to delete role', { error: error instanceof Error ? error.message : String(error), roleId: id });
      throw error;
    }
  }

  // =============================================================================
  // USER-ROLE ASSOCIATION OPERATIONS
  // =============================================================================

  async assignRoleToUser(data: UserRoleAssignData): Promise<void> {
    try {
      const userId = userIdSchema.parse(data.userId);
      const roleId = roleIdSchema.parse(data.roleId);

      await this.initializeDatabase();
      const db = await this.ensureDatabase();
      
      await db
        .insert(userRoles)
        .values({
          userId,
          roleId,
        })
        .onConflictDoNothing();

      this.getLogger().info('Role assigned to user successfully', { userId, roleId });
    } catch (error) {
      this.getLogger().error('Failed to assign role to user', { error: error instanceof Error ? error.message : String(error), data });
      throw error;
    }
  }

  async removeRoleFromUser(data: UserRoleAssignData): Promise<void> {
    try {
      const userId = userIdSchema.parse(data.userId);
      const roleId = roleIdSchema.parse(data.roleId);

      await this.initializeDatabase();
      const db = await this.ensureDatabase();
      
      await db
        .delete(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));

      this.getLogger().info('Role removed from user successfully', { userId, roleId });
    } catch (error) {
      this.getLogger().error('Failed to remove role from user', { error: error instanceof Error ? error.message : String(error), data });
      throw error;
    }
  }

  async setUserRoles(data: UserRolesSetData): Promise<void> {
    try {
      const validatedData = userRolesSetSchema.parse(data);

      await this.initializeDatabase();
      const db = await this.ensureDatabase();
      
      // Get role IDs for the provided role names
      const roleResults = await db
        .select({ id: roles.id })
        .from(roles)
        .where(inArray(roles.name, validatedData.roleNames));

      if (roleResults.length !== validatedData.roleNames.length) {
        throw new NotFoundError('Some roles not found');
      }

      const roleIds = roleResults.map((r) => r.id);

      // Use transaction to ensure atomicity
      await db.transaction(async (tx) => {
        // Remove all existing roles for this user
        await tx.delete(userRoles).where(eq(userRoles.userId, validatedData.userId));

        // Add new roles
        if (roleIds.length > 0) {
          await tx.insert(userRoles).values(
            roleIds.map((roleId) => ({
              userId: validatedData.userId,
              roleId,
            }))
          );
        }
      });

      this.getLogger().info('User roles set successfully', { userId: validatedData.userId, roleNames: validatedData.roleNames });
    } catch (error) {
      this.getLogger().error('Failed to set user roles', { error: error instanceof Error ? error.message : String(error), data });
      throw error;
    }
  }

  async updateUserRolesBulk(data: UserRolesBulkUpdate): Promise<void> {
    try {
      const userId = userIdSchema.parse(data.userId);
      const roleIds = data.roleIds.map((id) => roleIdSchema.parse(id));
      
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      await db.transaction(async (tx) => {
        // Remove all existing roles for this user
        await tx.delete(userRoles).where(eq(userRoles.userId, userId));

        // Add new roles
        if (roleIds.length > 0) {
          await tx.insert(userRoles).values(
            roleIds.map((roleId) => ({
              userId,
              roleId,
            }))
          );
        }
      });

      this.getLogger().info('User roles updated in bulk successfully', { userId, roleIds });
    } catch (error) {
      this.getLogger().error('Failed to bulk update user roles', { error: error instanceof Error ? error.message : String(error), data });
      throw error;
    }
  }

  async getUserRoleNames(userId: string): Promise<string[]> {
    try {
      const validUserId = userIdSchema.parse(userId);

      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const result = await db
        .select({ name: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, validUserId));

      return result.map((r) => r.name);
    } catch (error) {
      this.getLogger().error('Failed to get user role names', { error: error instanceof Error ? error.message : String(error), userId });
      throw error;
    }
  }

  async getUsersWithRoles(filter: UserRoleFilterQuery): Promise<string[]> {
    try {
      if (!filter.roleNames?.length) {
        return [];
      }

      const validRoleNames = roleNamesSchema.parse(filter.roleNames);
      
      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      let query = db
        .selectDistinct({ userId: userRoles.userId })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(inArray(roles.name, validRoleNames));

      if (filter.hasAllRoles) {
        // User must have ALL specified roles
        query = db
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(inArray(roles.name, validRoleNames))
          .groupBy(userRoles.userId)
          .having(sql`COUNT(DISTINCT ${roles.name}) = ${validRoleNames.length}`) as typeof query;
      }

      const result = await query;
      return result.map((r) => r.userId);
    } catch (error) {
      this.getLogger().error('Failed to get users with roles', { error: error instanceof Error ? error.message : String(error), filter });
      throw error;
    }
  }

  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const validUserId = userIdSchema.parse(userId);

      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(userRoles.userId, validUserId), eq(roles.name, roleName)))
        .limit(1);

      return (result[0]?.count ?? 0) > 0;
    } catch (error) {
      this.getLogger().error('Failed to check if user has role', { error: error instanceof Error ? error.message : String(error), userId, roleName });
      throw error;
    }
  }

  async userHasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    try {
      const validUserId = userIdSchema.parse(userId);
      const validRoleNames = roleNamesSchema.parse(roleNames);

      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(userRoles.userId, validUserId), inArray(roles.name, validRoleNames)))
        .limit(1);

      return (result[0]?.count ?? 0) > 0;
    } catch (error) {
      this.getLogger().error('Failed to check if user has any role', { error: error instanceof Error ? error.message : String(error), userId, roleNames });
      throw error;
    }
  }

  async userHasAllRoles(userId: string, roleNames: string[]): Promise<boolean> {
    try {
      const validUserId = userIdSchema.parse(userId);
      const validRoleNames = roleNamesSchema.parse(roleNames);

      await this.initializeDatabase();
      const db = await this.ensureDatabase();

      const result = await db
        .select({ count: sql<number>`count(DISTINCT ${roles.name})` })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(userRoles.userId, validUserId), inArray(roles.name, validRoleNames)));

      return (result[0]?.count ?? 0) === validRoleNames.length;
    } catch (error) {
      this.getLogger().error('Failed to check if user has all roles', { error: error instanceof Error ? error.message : String(error), userId, roleNames });
      throw error;
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private mapDbEntityToDomain(dbEntity: DbRoleEntity): Role {
    return {
      id: dbEntity.id,
      name: dbEntity.name,
      description: dbEntity.description,
      createdAt: dbEntity.createdAt,
      updatedAt: dbEntity.updatedAt,
    };
  }
}