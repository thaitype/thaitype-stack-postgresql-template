import type { User } from '~/server/domain/models';
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
} from './types/user-repository-types';

/**
 * Repository interface for User operations
 * Following Entity-Based Repository Architecture with dedicated methods
 * 
 * Architecture principles:
 * 1. Dedicated methods over generic operations
 * 2. Repository as single validation point
 * 3. Type safety with entity-derived types
 * 4. Clear operation boundaries
 * 5. Better Auth integration preserved
 */
export interface IUserRepository {
  // =============================================================================
  // BASIC CRUD OPERATIONS
  // =============================================================================
  
  /**
   * Create a new user record (integrates with Better Auth)
   */
  create(input: UserCreateRequest): Promise<User>;

  /**
   * Find user by ID (uses Better Auth API)
   */
  findById(id: string): Promise<User | null>;

  /**
   * Delete user record (hard delete)
   */
  delete(id: string): Promise<void>;

  // =============================================================================
  // DEDICATED UPDATE METHODS (No generic update!)
  // =============================================================================
  
  /**
   * Update user basic information (name, bio, avatar, website)
   */
  updateBasicInfo(id: string, input: UserBasicInfoPartialUpdate): Promise<void>;

  /**
   * Update user roles
   */
  updateRoles(id: string, input: UserRolesUpdate): Promise<void>;

  /**
   * Update user email
   */
  updateEmail(id: string, input: UserEmailUpdate): Promise<void>;

  /**
   * Update user active status
   */
  updateStatus(id: string, input: UserStatusUpdate): Promise<void>;

  /**
   * Update user profile (name, bio, avatar, website - excludes sensitive fields)
   */
  updateProfile(id: string, input: UserProfilePartialUpdate): Promise<User | null>;

  /**
   * Update user name only
   */
  updateName(id: string, input: UserNameUpdate): Promise<void>;

  /**
   * Update user bio only
   */
  updateBio(id: string, input: UserBioUpdate): Promise<void>;

  /**
   * Update user avatar only
   */
  updateAvatar(id: string, input: UserAvatarUpdate): Promise<void>;

  /**
   * Update user website only
   */
  updateWebsite(id: string, input: UserWebsiteUpdate): Promise<void>;

  // =============================================================================
  // QUERY OPERATIONS
  // =============================================================================
  
  /**
   * Find user by email (uses Better Auth API)
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find all users with filtering and pagination
   */
  findAll(
    filter?: Partial<User>,
    options?: {
      limit?: number;
      skip?: number;
      sort?: Record<string, 1 | -1>;
    }
  ): Promise<User[]>;

  /**
   * Count users with filtering
   */
  count(filter?: Partial<User>): Promise<number>;

}
