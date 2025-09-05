/**
 * User Repository Types
 * 
 * This file defines all repository-specific types derived from the DbUserEntity.
 * All types are strict subsets of the database schema using Pick<>, Partial<>, and Omit<>.
 * 
 * Key principles:
 * 1. Single source of truth: All types derive from ~/server/infrastructure/entities
 * 2. Type safety: No manual type definitions that could drift from entity schema
 * 3. Explicit operations: Each type represents a specific database operation
 */

import type { DbUserEntity } from '~/server/infrastructure/entities';

// =============================================================================
// USER CRUD TYPES
// =============================================================================

/**
 * Data required to create a new user record
 * Omits auto-generated fields: _id, createdAt, updatedAt, deletedAt
 */
export type UserCreateData = Omit<DbUserEntity, '_id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/**
 * Full user data with all fields (for domain layer responses)
 * Maps to the complete user entity structure
 */
export type UserFullData = DbUserEntity;

// =============================================================================
// USER UPDATE TYPES - Dedicated Methods
// =============================================================================

/**
 * Update user basic information (name, bio, avatar, website)
 * Used by: updateBasicInfo() repository method
 */
export type UserBasicInfoUpdate = Pick<DbUserEntity, 'name' | 'bio' | 'avatar' | 'website'>;

/**
 * Partial basic info update (for optional field changes)
 * Used by: updateBasicInfo() repository method when fields might be undefined
 */
export type UserBasicInfoPartialUpdate = Partial<UserBasicInfoUpdate>;

/**
 * Update user roles
 * Used by: updateRoles() repository method
 */
export type UserRolesUpdate = Pick<DbUserEntity, 'roles'>;

/**
 * Update user email
 * Used by: updateEmail() repository method
 */
export type UserEmailUpdate = Pick<DbUserEntity, 'email'>;

/**
 * Update user active status
 * Used by: updateStatus() repository method
 */
export type UserStatusUpdate = Pick<DbUserEntity, 'isActive'>;

/**
 * Update user bio only
 * Used by: updateBio() repository method
 */
export type UserBioUpdate = Pick<DbUserEntity, 'bio'>;

/**
 * Update user avatar only
 * Used by: updateAvatar() repository method
 */
export type UserAvatarUpdate = Pick<DbUserEntity, 'avatar'>;

/**
 * Update user website only
 * Used by: updateWebsite() repository method
 */
export type UserWebsiteUpdate = Pick<DbUserEntity, 'website'>;

/**
 * Update user name only
 * Used by: updateName() repository method
 */
export type UserNameUpdate = Pick<DbUserEntity, 'name'>;

// =============================================================================
// USER PROFILE UPDATE TYPES (subset of user fields)
// =============================================================================

/**
 * Profile-specific update fields (excludes sensitive fields like roles, email, isActive)
 * Used by: updateProfile() repository method
 */
export type UserProfileUpdate = Pick<DbUserEntity, 'name' | 'bio' | 'avatar' | 'website'>;

/**
 * Partial profile update (for optional profile changes)
 * Used by: updateProfile() repository method when fields might be undefined
 */
export type UserProfilePartialUpdate = Partial<UserProfileUpdate>;

// =============================================================================
// USER QUERY TYPES
// =============================================================================

/**
 * Query parameters for finding users by role
 * Used by: findByRole() repository method
 */
export type UserRoleQuery = {
  role: DbUserEntity['roles'][0];
  includeInactive?: boolean;
};

/**
 * Query parameters for finding users by email
 * Used by: findByEmail() repository method
 */
export type UserEmailQuery = {
  email: string;
  includeInactive?: boolean;
};

/**
 * Query parameters for finding active users
 * Used by: findActiveUsers() repository method
 */
export type UserActiveQuery = {
  activeOnly: true;
};

/**
 * Query parameters for user filtering and pagination
 * Used by: findAll() repository method
 */
export type UserFilterQuery = {
  email?: string;
  roles?: DbUserEntity['roles'];
  isActive?: boolean;
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
};

// =============================================================================
// USER SPECIALIZED TYPES
// =============================================================================

/**
 * Create user request (domain types for service layer)
 * Used by: create() repository method
 */
export type UserCreateRequest = {
  email: string;
  name: string;
  roles?: DbUserEntity['roles'];
  bio?: string;
  avatar?: string;
  website?: string;
  isActive?: boolean;
};

/**
 * Update user request (domain types for service layer)
 * Used by: updateUser() service method - combines multiple update operations
 */
export type UserUpdateRequest = {
  name?: string;
  roles?: DbUserEntity['roles'];
  bio?: string;
  avatar?: string;
  website?: string;
  isActive?: boolean;
};

/**
 * Profile update request (domain types for service layer)
 * Used by: updateProfile() service method - profile-specific fields only
 */
export type UserProfileUpdateRequest = {
  name?: string;
  bio?: string;
  avatar?: string;
  website?: string;
};

/**
 * User deletion data
 * Used by: delete() repository method
 */
export type UserDeleteData = {
  id: string;
  reason?: string;
};

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Type guards for user operations
 */
export type UserOperationType = 
  | 'create'
  | 'updateBasicInfo'
  | 'updateRoles'
  | 'updateEmail'
  | 'updateStatus'
  | 'updateBio'
  | 'updateAvatar'
  | 'updateWebsite'
  | 'updateName'
  | 'updateProfile'
  | 'delete'
  | 'findByRole'
  | 'findByEmail'
  | 'findActive';

/**
 * User validation context
 */
export type UserValidationContext = {
  operation: UserOperationType;
  userId?: string;
  targetUserId?: string;
  role?: string;
};