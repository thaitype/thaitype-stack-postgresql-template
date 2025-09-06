import type { CreateUserRequest, UpdateProfileRequest, UpdateUserRequest, User } from '~/server/domain/models';
import type { IUserRepository } from '~/server/domain/repositories';
import type { AppContext } from '~/server/context/app-context';
import { SYSTEM_USER_ID, type RepositoryContext } from '~/server/lib/constants';
import * as Err from '~/server/lib/errors/domain-errors';

export interface IUserService {
  createUser(data: CreateUserRequest): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, data: UpdateUserRequest, context: RepositoryContext): Promise<void>;
  updateUserProfile(id: string, data: UpdateProfileRequest, context: RepositoryContext): Promise<User | null>;
  deleteUser(id: string, context: RepositoryContext): Promise<void>;
  getAllUsers(
    filter?: Partial<User>,
    options?: {
      limit?: number;
      skip?: number;
      sort?: Record<string, 1 | -1>;
    }
  ): Promise<User[]>;
  getUserCount(filter?: Partial<User>): Promise<number>;
}

export class UserService implements IUserService {
  constructor(
    private appContext: AppContext,
    private userRepository: IUserRepository
  ) {}

  async createUser(data: CreateUserRequest): Promise<User> {
    this.appContext.logger.info('Creating user in service', {
      email: data.email,
      name: data.name,
      operation: 'createUser',
      service: 'UserService'
    });

    // Business logic: validate email uniqueness
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Err.ConflictError('User with this email already exists', { email: data.email });
    }

    // Set defaults and convert null to undefined for repository compatibility
    const userData = {
      ...data,
      roles: data.roles ?? (['admin'] as const),
      isActive: data.isActive ?? true,
      bio: data.bio ?? undefined,
      avatar: data.avatar ?? undefined, 
      website: data.website ?? undefined,
    };

    const user = await this.userRepository.create(userData, { operatedBy: SYSTEM_USER_ID });
    
    this.appContext.logger.info('User created successfully in service', {
      userId: user.id,
      email: data.email,
      operation: 'createUser'
    });

    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    if (!id) {
      throw new Err.ValidationError('User ID is required', { userId: id });
    }
    return await this.userRepository.findById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!email) {
      throw new Err.ValidationError('Email is required', { email });
    }
    return await this.userRepository.findByEmail(email);
  }

  async updateUser(id: string, data: UpdateUserRequest, context: RepositoryContext): Promise<void> {
    this.appContext.logger.info('Updating user in service', {
      userId: id,
      operation: 'updateUser',
      service: 'UserService'
    });

    if (!id) {
      throw new Err.ValidationError('User ID is required', { userId: id });
    }

    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Err.NotFoundError('User not found', { userId: id });
    }

    // Service responsibility: Use dedicated repository methods instead of generic update
    // Update basic info if any basic fields are provided
    if (data.name !== undefined || data.bio !== undefined || data.avatar !== undefined || data.website !== undefined) {
      await this.userRepository.updateBasicInfo(id, {
        name: data.name,
        bio: data.bio,
        avatar: data.avatar,
        website: data.website,
      }, context);
    }
    
    // Update roles if provided
    if (data.roles !== undefined) {
      await this.userRepository.updateRoles(id, { roles: data.roles }, context);
    }
    
    // Update status if provided
    if (data.isActive !== undefined) {
      await this.userRepository.updateStatus(id, { isActive: data.isActive }, context);
    }

    this.appContext.logger.info('User updated successfully in service', {
      userId: id,
      operation: 'updateUser'
    });
  }

  async updateUserProfile(id: string, data: UpdateProfileRequest, context: RepositoryContext): Promise<User | null> {
    this.appContext.logger.info('Updating user profile in service', {
      userId: id,
      operation: 'updateUserProfile',
      service: 'UserService'
    });

    if (!id) {
      throw new Err.ValidationError('User ID is required', { userId: id });
    }

    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Err.NotFoundError('User not found', { userId: id });
    }

    // Service responsibility: Use dedicated profile update method
    const updatedUser = await this.userRepository.updateProfile(id, {
      name: data.name,
      bio: data.bio,
      avatar: data.avatar,
      website: data.website,
    }, context);

    this.appContext.logger.info('User profile updated successfully in service', {
      userId: id,
      operation: 'updateUserProfile'
    });

    return updatedUser;
  }

  async deleteUser(id: string, context: RepositoryContext): Promise<void> {
    if (!id) {
      throw new Err.ValidationError('User ID is required', { userId: id });
    }

    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Err.NotFoundError('User not found', { userId: id });
    }

    await this.userRepository.delete(id, context);
  }

  async getAllUsers(
    filter?: Partial<User>,
    options?: {
      limit?: number;
      skip?: number;
      sort?: Record<string, 1 | -1>;
    }
  ): Promise<User[]> {
    return await this.userRepository.findAll(filter, options);
  }

  async getUserCount(filter?: Partial<User>): Promise<number> {
    return await this.userRepository.count(filter);
  }
}
