/**
 * Role Repository Interface - Entity-Based Architecture
 * 
 * Defines repository contracts for role management operations.
 * All methods accept domain types (strings) and are database-agnostic.
 * Repository implementations handle database-specific type conversions.
 */

import type { Role } from '~/server/infrastructure/db/schema';
// Repository context simplified to string-based for this implementation
import type {
  RoleCreateRequest,
  RoleBasicInfoUpdate,
  RoleBasicInfoPartialUpdate,
  RoleNameUpdate,
  RoleDescriptionUpdate,
  UserRoleAssignData,
  UserRolesBulkUpdate,
  UserRolesSetData,
  RoleFilterQuery,
  UserRoleFilterQuery,
} from './types/role-repository-types';

/**
 * Role repository interface for role entity operations
 */
export interface IRoleRepository {
  // =============================================================================
  // ROLE CRUD OPERATIONS
  // =============================================================================

  /**
   * Create a new role
   */
  create(data: RoleCreateRequest): Promise<Role>;

  /**
   * Find role by ID
   */
  findById(id: string): Promise<Role | null>;

  /**
   * Find role by name
   */
  findByName(name: string): Promise<Role | null>;

  /**
   * Find roles by names
   */
  findByNames(names: string[]): Promise<Role[]>;

  /**
   * Find all roles with optional filtering
   */
  findAll(filter?: RoleFilterQuery): Promise<Role[]>;

  /**
   * Update role basic information
   */
  updateBasicInfo(
    id: string,
    data: RoleBasicInfoUpdate
  ): Promise<Role>;

  /**
   * Partially update role basic information
   */
  updateBasicInfoPartial(
    id: string,
    data: RoleBasicInfoPartialUpdate
  ): Promise<Role>;

  /**
   * Update role name only
   */
  updateName(id: string, data: RoleNameUpdate): Promise<Role>;

  /**
   * Update role description only
   */
  updateDescription(
    id: string,
    data: RoleDescriptionUpdate
  ): Promise<Role>;

  /**
   * Delete role by ID
   */
  deleteById(id: string): Promise<void>;

  // =============================================================================
  // USER-ROLE ASSOCIATION OPERATIONS
  // =============================================================================

  /**
   * Assign a role to a user
   */
  assignRoleToUser(data: UserRoleAssignData): Promise<void>;

  /**
   * Remove a role from a user
   */
  removeRoleFromUser(data: UserRoleAssignData): Promise<void>;

  /**
   * Set user roles (complete replacement)
   * Repository handles role name to ID resolution
   */
  setUserRoles(data: UserRolesSetData): Promise<void>;

  /**
   * Bulk update user roles by IDs
   */
  updateUserRolesBulk(data: UserRolesBulkUpdate): Promise<void>;

  /**
   * Get all role names for a user
   */
  getUserRoleNames(userId: string): Promise<string[]>;

  /**
   * Get all users with specific roles
   */
  getUsersWithRoles(filter: UserRoleFilterQuery): Promise<string[]>;

  /**
   * Check if user has specific role
   */
  userHasRole(userId: string, roleName: string): Promise<boolean>;

  /**
   * Check if user has any of the specified roles
   */
  userHasAnyRole(userId: string, roleNames: string[]): Promise<boolean>;

  /**
   * Check if user has all of the specified roles
   */
  userHasAllRoles(userId: string, roleNames: string[]): Promise<boolean>;
}