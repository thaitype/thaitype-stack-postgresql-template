/**
 * Role Repository Types - Entity-Based Architecture
 * 
 * All types derive from database entities following the single source of truth principle.
 * Uses TypeScript utility types to create precise subsets of database entities.
 */

import type { DbRoleEntity, DbUserRoleEntity } from '~/server/infrastructure/db/schema';

// =============================================================================
// ROLE ENTITY OPERATIONS
// =============================================================================

/**
 * Data required for creating a new role
 * Derives from DbRoleEntity, excluding auto-generated fields
 */
export type RoleCreateRequest = Omit<DbRoleEntity, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Data for updating role basic information
 */
export type RoleBasicInfoUpdate = Pick<DbRoleEntity, 'name' | 'description'>;

/**
 * Partial update for role basic information (all fields optional)
 */
export type RoleBasicInfoPartialUpdate = Partial<RoleBasicInfoUpdate>;

/**
 * Data for updating just the role name
 */
export type RoleNameUpdate = Pick<DbRoleEntity, 'name'>;

/**
 * Data for updating just the role description
 */
export type RoleDescriptionUpdate = Pick<DbRoleEntity, 'description'>;

// =============================================================================
// USER-ROLE ASSOCIATION OPERATIONS
// =============================================================================

/**
 * Data for assigning a role to a user
 */
export type UserRoleAssignData = Pick<DbUserRoleEntity, 'userId' | 'roleId'>;

/**
 * Data for bulk user-role operations
 */
export type UserRolesBulkUpdate = {
  userId: string;
  roleIds: string[];
};

/**
 * Data for setting user roles (complete replacement)
 * Service layer passes role names, repository handles ID resolution
 */
export type UserRolesSetData = {
  userId: string;
  roleNames: string[];
};

// =============================================================================
// QUERY FILTER TYPES
// =============================================================================

/**
 * Role filtering options for queries
 */
export type RoleFilterQuery = {
  name?: string;
  names?: string[];
};

/**
 * User filtering by roles
 */
export type UserRoleFilterQuery = {
  roleNames?: string[];
  hasAllRoles?: boolean; // true = must have ALL roles, false = must have ANY role
};