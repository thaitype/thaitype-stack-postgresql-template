import { auth } from './auth';
import { getDatabase } from './db';
import { eq } from 'drizzle-orm';
import { users } from '../infrastructure/db/schema';
import type { DbUserEntity } from '../infrastructure/entities';

// Better Auth types
interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  roles?: string[];
  bio?: string;
  avatar?: string;
  website?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

interface BetterAuthSignUpResponse {
  data?: {
    user: BetterAuthUser;
    session?: unknown;
  } | null;
  error?: string;
}

interface BetterAuthInstance {
  api: {
    signUpEmail: (params: {
      email: string;
      password: string;
      name: string;
      roles?: string[];
      bio?: string;
      avatar?: string;
      website?: string;
    }) => Promise<BetterAuthSignUpResponse>;
    // Add other api methods as needed
    [key: string]: unknown;
  };
  // Add other properties as needed
  handler: (request: Request) => Promise<Response>;
  [key: string]: unknown;
}

/**
 * Better Auth API wrapper for user operations
 * Provides clean interface for user management with Drizzle/PostgreSQL integration
 */
export class AuthUserAPI {
  private authInstance: BetterAuthInstance | null = null;

  private async getAuthInstance(): Promise<BetterAuthInstance> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.authInstance ??= auth as any;
    if(!this.authInstance) {
      throw new Error('Better Auth instance not initialized');
    }
    return this.authInstance;
  }

  /**
   * Create a new user via Better Auth
   */
  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    roles?: string[];
    bio?: string;
    avatar?: string;
    website?: string;
  }): Promise<DbUserEntity> {
    try {
      const authInstance = await this.getAuthInstance();
      
      // Create user via Better Auth
      const result: BetterAuthSignUpResponse = await authInstance.api.signUpEmail({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        roles: userData.roles ?? ['user'],
        bio: userData.bio,
        avatar: userData.avatar,
        website: userData.website,
      });

      if (!result.data?.user) {
        throw new Error('Failed to create user via Better Auth');
      }

      const betterAuthUser = result.data.user;

      // Convert to our User type
      const user: DbUserEntity = {
        id: betterAuthUser.id,
        email: betterAuthUser.email,
        name: betterAuthUser.name,
        roles: (betterAuthUser.roles ?? ['user']) as ('admin' | 'user')[],
        bio: betterAuthUser.bio ?? null,
        avatar: betterAuthUser.avatar ?? null,
        website: betterAuthUser.website ?? null,
        isActive: true,
        createdAt: betterAuthUser.createdAt,
        updatedAt: betterAuthUser.updatedAt,
      };

      console.log(`[AuthUserAPI] User created successfully: ${user.email}`);
      return user;
    } catch (error) {
      console.error('[AuthUserAPI] Error creating user:', error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get user by ID via direct database access
   */
  async getUserById(userId: string): Promise<DbUserEntity | null> {
    try {
      const db = await getDatabase();
      
      // Find user by ID using Drizzle
      const [userData] = await db.select().from(users).where(eq(users.id, userId));

      if (!userData) {
        return null;
      }

      return userData;
    } catch (error) {
      console.error('[AuthUserAPI] Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Get user by email via direct database access
   */
  async getUserByEmail(email: string): Promise<DbUserEntity | null> {
    try {
      const db = await getDatabase();
      
      // Find user by email using Drizzle
      const [userData] = await db.select().from(users).where(eq(users.email, email));

      if (!userData) {
        return null;
      }

      return userData;
    } catch (error) {
      console.error('[AuthUserAPI] Error getting user by email:', error);
      return null;
    }
  }

  /**
   * Note: User updates should be handled through Better Auth's built-in mechanisms
   * This method is not implemented as Better Auth manages user data internally
   */
  async updateUser(): Promise<never> {
    throw new Error('User updates should be handled through Better Auth. Use Better Auth client-side APIs or admin functions.');
  }

  /**
   * Note: User deletion should be handled through Better Auth's built-in mechanisms
   * Better Auth doesn't support soft delete - users are managed by Better Auth
   */
  async deleteUser(): Promise<never> {
    throw new Error('User deletion should be handled through Better Auth. Better Auth does not support soft delete.');
  }

  /**
   * Note: User restoration not applicable as Better Auth doesn't support soft delete
   */
  async restoreUser(): Promise<never> {
    throw new Error('User restoration not applicable. Better Auth does not support soft delete.');
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<DbUserEntity[]> {
    try {
      const db = await getDatabase();
      
      // Get all users using Drizzle
      const allUsers = await db.select().from(users);

      return allUsers;
    } catch (error) {
      console.error('[AuthUserAPI] Error getting all users:', error);
      throw new Error(`Failed to get all users: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if user exists by email
   */
  async userExistsByEmail(email: string): Promise<boolean> {
    try {
      const user = await this.getUserByEmail(email);
      return user !== null;
    } catch (error) {
      console.error('[AuthUserAPI] Error checking user existence:', error);
      return false;
    }
  }

  /**
   * Note: Credential validation should be handled through Better Auth's built-in mechanisms
   * Use Better Auth client-side sign-in or session validation instead
   */
  async validateCredentials(): Promise<never> {
    throw new Error('Credential validation should be handled through Better Auth client-side APIs or session validation.');
  }
}

// Export singleton instance
export const authUserAPI = new AuthUserAPI();
export default authUserAPI;