/**
 * Drizzle Role Repository Implementation - Entity-Based Architecture
 * 
 * Implements role repository interface using Drizzle ORM with PostgreSQL.
 * Handles string-to-UUID conversion and database-specific operations.
 * Follows the single source of truth principle from database entities.
 */

import { and, eq, inArray, sql } from 'drizzle-orm';
import { BasePostgresRepository } from './base/base-postgres-repository';
import type { IRoleRepository } from '~/server/domain/repositories/role-repository';
import type { Role } from '~/server/infrastructure/db/schema';
import type { RepositoryContext } from '~/server/lib/validation/repository-context';
import type { AppContext } from '~/server/context/app-context';
import {
  roles,
  userRoles,
  users,
  type DbRoleEntity,
  type DbUserRoleEntity,
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
import { matches } from '~/server/lib/validation/zod-matches';
import { z } from 'zod';
import { DomainError } from '~/server/lib/errors/domain-errors';

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
  description: z.string().nullable().optional(),
}) satisfies z.ZodType<RoleCreateRequest>;

const roleBasicInfoUpdateSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().nullable().optional(),
}) satisfies z.ZodType<RoleBasicInfoUpdate>;

const userRolesSetSchema = z.object({
  userId: userIdSchema,
  roleNames: roleNamesSchema,
}) satisfies z.ZodType<UserRolesSetData>;

export class DrizzleRoleRepository extends BasePostgresRepository implements IRoleRepository {
  constructor(private appContext: AppContext) {
    super('Role');
  }

  protected getLogger() {
    return this.appContext.logger;
  }

  // =============================================================================
  // ROLE CRUD OPERATIONS
  // =============================================================================

  async create(data: RoleCreateRequest, context: RepositoryContext): Promise<Role> {
    try {
      const validatedData = roleCreateSchema.parse(data);

      const result = await this.appContext.db
        .insert(roles)
        .values(validatedData)
        .returning();

      const role = result[0];
      if (!role) {
        throw new DomainError('Failed to create role', 'CREATION_FAILED');
      }

      this.getLogger().info(
        { roleId: role.id, roleName: role.name, operatedBy: context.operatedBy },
        'Role created successfully'
      );

      return this.mapDbEntityToDomain(role);
    } catch (error) {
      this.getLogger().error(
        { error, data, operatedBy: context.operatedBy },
        'Failed to create role'
      );
      throw error;
    }
  }

  async findById(id: string): Promise<Role | null> {
    try {
      const roleId = roleIdSchema.parse(id);

      const result = await this.appContext.db
        .select()
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1);

      const role = result[0];
      return role ? this.mapDbEntityToDomain(role) : null;
    } catch (error) {
      this.getLogger().error({ error, roleId: id }, 'Failed to find role by ID');
      throw error;
    }
  }

  async findByName(name: string): Promise<Role | null> {
    try {
      const result = await this.appContext.db
        .select()
        .from(roles)
        .where(eq(roles.name, name))
        .limit(1);

      const role = result[0];
      return role ? this.mapDbEntityToDomain(role) : null;
    } catch (error) {
      this.getLogger().error({ error, roleName: name }, 'Failed to find role by name');
      throw error;
    }
  }

  async findByNames(names: string[]): Promise<Role[]> {
    try {
      const validatedNames = roleNamesSchema.parse(names);

      const result = await this.appContext.db
        .select()
        .from(roles)
        .where(inArray(roles.name, validatedNames));

      return result.map((role) => this.mapDbEntityToDomain(role));
    } catch (error) {
      this.getLogger().error({ error, roleNames: names }, 'Failed to find roles by names');
      throw error;
    }
  }

  async findAll(filter?: RoleFilterQuery): Promise<Role[]> {
    try {
      let query = this.appContext.db.select().from(roles);

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
          query = query.where(and(...conditions));
        }
      }

      const result = await query;
      return result.map((role) => this.mapDbEntityToDomain(role));
    } catch (error) {
      this.getLogger().error({ error, filter }, 'Failed to find all roles');
      throw error;
    }
  }

  async updateBasicInfo(
    id: string,
    data: RoleBasicInfoUpdate,
    context: RepositoryContext
  ): Promise<Role> {
    try {
      const roleId = roleIdSchema.parse(id);
      const validatedData = roleBasicInfoUpdateSchema.parse(data);

      const result = await this.appContext.db
        .update(roles)
        .set(validatedData)
        .where(eq(roles.id, roleId))
        .returning();

      const role = result[0];
      if (!role) {
        throw new DomainError('Role not found or update failed', 'NOT_FOUND');
      }

      this.getLogger().info(
        { roleId: role.id, operatedBy: context.operatedBy },
        'Role basic info updated successfully'
      );

      return this.mapDbEntityToDomain(role);
    } catch (error) {
      this.getLogger().error(
        { error, roleId: id, data, operatedBy: context.operatedBy },
        'Failed to update role basic info'
      );
      throw error;
    }
  }

  async updateBasicInfoPartial(
    id: string,
    data: RoleBasicInfoPartialUpdate,
    context: RepositoryContext
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

      const result = await this.appContext.db
        .update(roles)
        .set(updateData)
        .where(eq(roles.id, roleId))
        .returning();

      const role = result[0];
      if (!role) {
        throw new DomainError('Role not found or update failed', 'NOT_FOUND');
      }

      this.getLogger().info(
        { roleId: role.id, operatedBy: context.operatedBy },
        'Role basic info updated partially'
      );

      return this.mapDbEntityToDomain(role);
    } catch (error) {
      this.getLogger().error(
        { error, roleId: id, data, operatedBy: context.operatedBy },
        'Failed to partially update role basic info'
      );
      throw error;
    }
  }

  async updateName(id: string, data: RoleNameUpdate, context: RepositoryContext): Promise<Role> {
    return this.updateBasicInfoPartial(id, { name: data.name }, context);
  }

  async updateDescription(
    id: string,
    data: RoleDescriptionUpdate,
    context: RepositoryContext
  ): Promise<Role> {
    return this.updateBasicInfoPartial(id, { description: data.description }, context);
  }

  async deleteById(id: string, context: RepositoryContext): Promise<void> {
    try {
      const roleId = roleIdSchema.parse(id);

      const result = await this.appContext.db.delete(roles).where(eq(roles.id, roleId)).returning();

      if (!result[0]) {
        throw new DomainError('Role not found', 'NOT_FOUND');
      }

      this.getLogger().info(
        { roleId, operatedBy: context.operatedBy },
        'Role deleted successfully'
      );
    } catch (error) {
      this.getLogger().error(
        { error, roleId: id, operatedBy: context.operatedBy },
        'Failed to delete role'
      );
      throw error;
    }
  }

  // =============================================================================
  // USER-ROLE ASSOCIATION OPERATIONS
  // =============================================================================

  async assignRoleToUser(data: UserRoleAssignData, context: RepositoryContext): Promise<void> {
    try {
      const userId = userIdSchema.parse(data.userId);
      const roleId = roleIdSchema.parse(data.roleId);

      await this.appContext.db
        .insert(userRoles)
        .values({
          userId,
          roleId,
        })
        .onConflictDoNothing();

      this.getLogger().info(
        { userId, roleId, operatedBy: context.operatedBy },
        'Role assigned to user successfully'
      );
    } catch (error) {
      this.getLogger().error(
        { error, data, operatedBy: context.operatedBy },
        'Failed to assign role to user'
      );
      throw error;
    }
  }

  async removeRoleFromUser(data: UserRoleAssignData, context: RepositoryContext): Promise<void> {
    try {
      const userId = userIdSchema.parse(data.userId);
      const roleId = roleIdSchema.parse(data.roleId);

      await this.appContext.db
        .delete(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));

      this.getLogger().info(
        { userId, roleId, operatedBy: context.operatedBy },
        'Role removed from user successfully'
      );
    } catch (error) {
      this.getLogger().error(
        { error, data, operatedBy: context.operatedBy },
        'Failed to remove role from user'
      );
      throw error;
    }
  }

  async setUserRoles(data: UserRolesSetData, context: RepositoryContext): Promise<void> {
    try {
      const validatedData = userRolesSetSchema.parse(data);

      // Get role IDs for the provided role names
      const roleResults = await this.appContext.db
        .select({ id: roles.id })
        .from(roles)
        .where(inArray(roles.name, validatedData.roleNames));

      if (roleResults.length !== validatedData.roleNames.length) {
        throw new DomainError('Some roles not found', 'NOT_FOUND');
      }

      const roleIds = roleResults.map((r) => r.id);

      // Use transaction to ensure atomicity
      await this.appContext.db.transaction(async (tx) => {
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

      this.getLogger().info(
        { userId: validatedData.userId, roleNames: validatedData.roleNames, operatedBy: context.operatedBy },
        'User roles set successfully'
      );
    } catch (error) {
      this.getLogger().error(
        { error, data, operatedBy: context.operatedBy },
        'Failed to set user roles'
      );
      throw error;
    }
  }

  async updateUserRolesBulk(data: UserRolesBulkUpdate, context: RepositoryContext): Promise<void> {
    try {
      const userId = userIdSchema.parse(data.userId);
      const roleIds = data.roleIds.map((id) => roleIdSchema.parse(id));

      await this.appContext.db.transaction(async (tx) => {
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

      this.getLogger().info(
        { userId, roleIds, operatedBy: context.operatedBy },
        'User roles updated in bulk successfully'
      );
    } catch (error) {
      this.getLogger().error(
        { error, data, operatedBy: context.operatedBy },
        'Failed to bulk update user roles'
      );
      throw error;
    }
  }

  async getUserRoleNames(userId: string): Promise<string[]> {
    try {
      const validUserId = userIdSchema.parse(userId);

      const result = await this.appContext.db
        .select({ name: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, validUserId));

      return result.map((r) => r.name);
    } catch (error) {
      this.getLogger().error({ error, userId }, 'Failed to get user role names');
      throw error;
    }
  }

  async getUsersWithRoles(filter: UserRoleFilterQuery): Promise<string[]> {
    try {
      if (!filter.roleNames?.length) {
        return [];
      }

      const validRoleNames = roleNamesSchema.parse(filter.roleNames);

      let query = this.appContext.db
        .selectDistinct({ userId: userRoles.userId })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(inArray(roles.name, validRoleNames));

      if (filter.hasAllRoles) {
        // User must have ALL specified roles
        query = this.appContext.db
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(inArray(roles.name, validRoleNames))
          .groupBy(userRoles.userId)
          .having(sql`COUNT(DISTINCT ${roles.name}) = ${validRoleNames.length}`);
      }

      const result = await query;
      return result.map((r) => r.userId);
    } catch (error) {
      this.getLogger().error({ error, filter }, 'Failed to get users with roles');
      throw error;
    }
  }

  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const validUserId = userIdSchema.parse(userId);

      const result = await this.appContext.db
        .select({ count: sql<number>`count(*)` })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(userRoles.userId, validUserId), eq(roles.name, roleName)))
        .limit(1);

      return (result[0]?.count ?? 0) > 0;
    } catch (error) {
      this.getLogger().error({ error, userId, roleName }, 'Failed to check if user has role');
      throw error;
    }
  }

  async userHasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    try {
      const validUserId = userIdSchema.parse(userId);
      const validRoleNames = roleNamesSchema.parse(roleNames);

      const result = await this.appContext.db
        .select({ count: sql<number>`count(*)` })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(userRoles.userId, validUserId), inArray(roles.name, validRoleNames)))
        .limit(1);

      return (result[0]?.count ?? 0) > 0;
    } catch (error) {
      this.getLogger().error({ error, userId, roleNames }, 'Failed to check if user has any role');
      throw error;
    }
  }

  async userHasAllRoles(userId: string, roleNames: string[]): Promise<boolean> {
    try {
      const validUserId = userIdSchema.parse(userId);
      const validRoleNames = roleNamesSchema.parse(roleNames);

      const result = await this.appContext.db
        .select({ count: sql<number>`count(DISTINCT ${roles.name})` })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(userRoles.userId, validUserId), inArray(roles.name, validRoleNames)));

      return (result[0]?.count ?? 0) === validRoleNames.length;
    } catch (error) {
      this.getLogger().error({ error, userId, roleNames }, 'Failed to check if user has all roles');
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