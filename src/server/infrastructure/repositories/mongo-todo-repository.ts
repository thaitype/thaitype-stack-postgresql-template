/**
 * MongoDB Todo Repository - Entity-Based Architecture
 * 
 * This implementation follows the definitive repository design rules:
 * 1. Repository methods accept clear entity subset types (not unknown)
 * 2. Validation happens inside repository using Zod schemas
 * 3. Schema output must match input type exactly using matches<T>()
 * 4. ObjectId conversion handled in schemas or parseObjectId() method
 * 5. Explicit MongoDB operations, no buildMongoUpdate
 * 6. Consistent naming convention
 */

import type { AppContext } from '~/server/context/app-context';
import type { ITodoRepository, Todo } from '~/server/domain';
import type { DbTodoEntity } from '~/server/infrastructure/entities';
import type { RepositoryContext } from '~/server/lib/constants';
import { isValidObjectId } from '~/server/lib/constants';
import { ObjectId, type Db, type Filter } from 'mongodb';
import { BaseMongoRepository } from './base-mongo-repository';
import * as Err from '~/server/lib/errors/domain-errors';

// Import validation schemas
import {
  RepoTodoCreateSchema,
  RepoTodoContentUpdateSchema,
  RepoTodoStatusUpdateSchema,
  RepoTodoTitleUpdateSchema,
  RepoTodoDescriptionUpdateSchema,
  RepoObjectIdSchema,
} from '~/server/domain/repositories/schemas/todo-repository-schemas';

// Import repository types
import type {
  TodoCreateRequest,
  TodoContentPartialUpdate,
  TodoStatusUpdate,
  TodoTitleUpdate,
  TodoDescriptionUpdate,
  TodoFilterQuery,
} from '~/server/domain/repositories/types/todo-repository-types';

export class MongoTodoRepository extends BaseMongoRepository<DbTodoEntity> implements ITodoRepository {
  constructor(private appContext: AppContext, db: Db) {
    super(db, 'todos', {
      monguardOptions: {
        enableAuditLogging: true,
      },
    });
  }

  protected getLogger() {
    return this.appContext.logger;
  }

  /**
   * Centralized ObjectId parsing with validation
   * Provides consistent error handling across all repository methods
   */
  private parseObjectId(id: string): ObjectId {
    if (!isValidObjectId(id)) {
      throw new Err.ValidationError(`Invalid ObjectId format: ${id}. Expected 24-character hex string.`, {
        objectId: id,
        expectedFormat: '24-character hex string'
      });
    }
    return new ObjectId(id);
  }

  /**
   * Convert database entity to domain model
   */
  private toDomainTodo(dbTodo: DbTodoEntity): Todo {
    return {
      id: (dbTodo._id as ObjectId)?.toString() ?? '',
      title: dbTodo.title,
      description: dbTodo.description,
      completed: dbTodo.completed,
      userId: (dbTodo.userId)?.toString() ?? '',
      createdAt: dbTodo.createdAt,
      updatedAt: dbTodo.updatedAt,
    };
  }

  async create(input: TodoCreateRequest, context: RepositoryContext): Promise<Todo> {
    try {
      this.appContext.logger.info('Creating todo in repository', {
        title: input.title,
        userId: input.userId,
        operation: 'create',
        repository: 'MongoTodoRepository'
      });

      // Validation happens here in repository
      const validatedData = RepoTodoCreateSchema.parse(input);

      const newTodo: Omit<DbTodoEntity, '_id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
        title: validatedData.title,
        description: validatedData.description,
        completed: false,
        userId: validatedData.userId,
      };

      const createdTodo = await this.collection.create(
        newTodo,
        { userContext: this.resolveUserContext(context) }
      );

      this.appContext.logger.info('Todo created successfully in repository', {
        todoId: createdTodo._id.toString(),
        title: validatedData.title,
        operation: 'create'
      });

      return this.toDomainTodo(createdTodo);
    } catch (error) {
      this.appContext.logger.error('Failed to create todo', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: input.userId,
        operation: 'create',
        repository: 'MongoTodoRepository'
      });
      throw error;
    }
  }

  async findById(id: string, userId: string): Promise<Todo | null> {
    try {
      this.appContext.logger.info('Finding todo by ID', {
        todoId: id,
        userId,
        operation: 'findById',
        repository: 'MongoTodoRepository'
      });

      const todoObjectId = this.parseObjectId(id);
      const userObjectId = this.parseObjectId(userId);

      // Use findById for direct ID lookup and then verify ownership
      const todo = await this.collection.findById(todoObjectId);
      
      // Check if todo exists, belongs to user, and is not deleted
      if (!todo || !todo.userId.equals(userObjectId) || todo.deletedAt) {
        this.appContext.logger.info('Todo not found or not accessible', {
          todoId: id,
          userId,
          operation: 'findById'
        });
        return null;
      }

      return this.toDomainTodo(todo);
    } catch (error) {
      this.appContext.logger.error('Failed to find todo by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId: id,
        userId,
        operation: 'findById',
        repository: 'MongoTodoRepository'
      });
      throw error;
    }
  }

  async delete(id: string, userId: string, context: RepositoryContext): Promise<void> {
    try {
      this.appContext.logger.info('Deleting todo', {
        todoId: id,
        userId,
        operation: 'delete',
        repository: 'MongoTodoRepository'
      });

      const todoObjectId = this.parseObjectId(id);
      const userObjectId = this.parseObjectId(userId);

      // First verify the todo exists and belongs to user
      const existingTodo = await this.collection.findById(todoObjectId);
      if (!existingTodo || !existingTodo.userId.equals(userObjectId) || existingTodo.deletedAt) {
        throw new Err.NotFoundError(`Todo not found or not owned by user: ${id}`);
      }

      // Use soft delete via Monguard
      await this.collection.deleteById(
        todoObjectId, 
        { userContext: this.resolveUserContext(context) }
      );

      this.appContext.logger.info('Todo deleted successfully', {
        todoId: id,
        userId,
        operation: 'delete'
      });
    } catch (error) {
      this.appContext.logger.error('Failed to delete todo', {
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId: id,
        userId,
        operation: 'delete',
        repository: 'MongoTodoRepository'
      });
      throw error;
    }
  }

  async updateContent(id: string, input: TodoContentPartialUpdate, userId: string, context: RepositoryContext): Promise<void> {
    try {
      const validatedData = RepoTodoContentUpdateSchema.parse(input);
      const todoObjectId = this.parseObjectId(id);
      const userObjectId = this.parseObjectId(userId);

      // First verify the todo exists and belongs to user
      const existingTodo = await this.collection.findById(todoObjectId);
      if (!existingTodo || !existingTodo.userId.equals(userObjectId) || existingTodo.deletedAt) {
        throw new Err.NotFoundError(`Todo not found or not owned by user: ${id}`);
      }

      const updateDoc: Partial<DbTodoEntity> = {};
      if (validatedData.title !== undefined) updateDoc.title = validatedData.title;
      if (validatedData.description !== undefined) updateDoc.description = validatedData.description;

      await this.collection.updateById(
        todoObjectId,
        { $set: updateDoc },
        { userContext: this.resolveUserContext(context) }
      );

      this.appContext.logger.info('Todo content updated successfully', {
        todoId: id,
        userId,
        operation: 'updateContent'
      });
    } catch (error) {
      this.appContext.logger.error('Failed to update todo content', {
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId: id,
        userId,
        operation: 'updateContent',
        repository: 'MongoTodoRepository'
      });
      throw error;
    }
  }

  async updateStatus(id: string, input: TodoStatusUpdate, userId: string, context: RepositoryContext): Promise<void> {
    try {
      const validatedData = RepoTodoStatusUpdateSchema.parse(input);
      const todoObjectId = this.parseObjectId(id);
      const userObjectId = this.parseObjectId(userId);

      // First verify the todo exists and belongs to user
      const existingTodo = await this.collection.findById(todoObjectId);
      if (!existingTodo || !existingTodo.userId.equals(userObjectId) || existingTodo.deletedAt) {
        throw new Err.NotFoundError(`Todo not found or not owned by user: ${id}`);
      }

      await this.collection.updateById(
        todoObjectId,
        { $set: { completed: validatedData.completed } },
        { userContext: this.resolveUserContext(context) }
      );

      this.appContext.logger.info('Todo status updated successfully', {
        todoId: id,
        userId,
        completed: validatedData.completed,
        operation: 'updateStatus'
      });
    } catch (error) {
      this.appContext.logger.error('Failed to update todo status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId: id,
        userId,
        operation: 'updateStatus',
        repository: 'MongoTodoRepository'
      });
      throw error;
    }
  }

  async updateTitle(id: string, input: TodoTitleUpdate, userId: string, context: RepositoryContext): Promise<void> {
    try {
      const validatedData = RepoTodoTitleUpdateSchema.parse(input);
      const todoObjectId = this.parseObjectId(id);
      const userObjectId = this.parseObjectId(userId);

      // First verify the todo exists and belongs to user
      const existingTodo = await this.collection.findById(todoObjectId);
      if (!existingTodo || !existingTodo.userId.equals(userObjectId) || existingTodo.deletedAt) {
        throw new Err.NotFoundError(`Todo not found or not owned by user: ${id}`);
      }

      await this.collection.updateById(
        todoObjectId,
        { $set: { title: validatedData.title } },
        { userContext: this.resolveUserContext(context) }
      );

      this.appContext.logger.info('Todo title updated successfully', {
        todoId: id,
        userId,
        operation: 'updateTitle'
      });
    } catch (error) {
      this.appContext.logger.error('Failed to update todo title', {
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId: id,
        userId,
        operation: 'updateTitle',
        repository: 'MongoTodoRepository'
      });
      throw error;
    }
  }

  async updateDescription(id: string, input: TodoDescriptionUpdate, userId: string, context: RepositoryContext): Promise<void> {
    try {
      const validatedData = RepoTodoDescriptionUpdateSchema.parse(input);
      const todoObjectId = this.parseObjectId(id);
      const userObjectId = this.parseObjectId(userId);

      // First verify the todo exists and belongs to user
      const existingTodo = await this.collection.findById(todoObjectId);
      if (!existingTodo || !existingTodo.userId.equals(userObjectId) || existingTodo.deletedAt) {
        throw new Err.NotFoundError(`Todo not found or not owned by user: ${id}`);
      }

      await this.collection.updateById(
        todoObjectId,
        { $set: { description: validatedData.description } },
        { userContext: this.resolveUserContext(context) }
      );

      this.appContext.logger.info('Todo description updated successfully', {
        todoId: id,
        userId,
        operation: 'updateDescription'
      });
    } catch (error) {
      this.appContext.logger.error('Failed to update todo description', {
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId: id,
        userId,
        operation: 'updateDescription',
        repository: 'MongoTodoRepository'
      });
      throw error;
    }
  }

  async toggleCompletion(id: string, userId: string, context: RepositoryContext): Promise<Todo> {
    try {
      const todoObjectId = this.parseObjectId(id);
      const userObjectId = this.parseObjectId(userId);

      // First, get the current todo to know its status
      const currentTodo = await this.collection.findById(todoObjectId);
      if (!currentTodo || !currentTodo.userId.equals(userObjectId) || currentTodo.deletedAt) {
        throw new Err.NotFoundError(`Todo not found or not owned by user: ${id}`);
      }

      const newCompletedStatus = !currentTodo.completed;

      await this.collection.updateById(
        todoObjectId,
        { $set: { completed: newCompletedStatus } },
        { userContext: this.resolveUserContext(context) }
      );

      // Return the updated todo
      const updatedTodo = await this.collection.findById(todoObjectId);
      if (!updatedTodo) {
        throw new Err.NotFoundError('Failed to retrieve updated todo');
      }

      this.appContext.logger.info('Todo completion toggled successfully', {
        todoId: id,
        userId,
        newStatus: newCompletedStatus,
        operation: 'toggleCompletion'
      });

      return this.toDomainTodo(updatedTodo);
    } catch (error) {
      this.appContext.logger.error('Failed to toggle todo completion', {
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId: id,
        userId,
        operation: 'toggleCompletion',
        repository: 'MongoTodoRepository'
      });
      throw error;
    }
  }

  async findByUserId(
    userId: string,
    options?: {
      includeCompleted?: boolean;
      limit?: number;
      skip?: number;
      sort?: Record<string, 1 | -1>;
    }
  ): Promise<Todo[]> {
    try {
      const userObjectId = this.parseObjectId(userId);

      const filter: any = {
        userId: userObjectId,
        deletedAt: { $exists: false }
      };

      // Filter by completion status if specified
      if (options?.includeCompleted === false) {
        filter.completed = false;
      }

      // Build query options
      const queryOptions: any = {};
      
      // Apply sorting (default to newest first)
      if (options?.sort) {
        queryOptions.sort = options.sort;
      } else {
        queryOptions.sort = { createdAt: -1 };
      }

      // Apply pagination
      if (options?.skip) {
        queryOptions.skip = options.skip;
      }
      if (options?.limit) {
        queryOptions.limit = options.limit;
      }

      const todos = await this.collection.find(filter, queryOptions);

      this.appContext.logger.info('Found todos for user', {
        userId,
        count: todos.length,
        includeCompleted: options?.includeCompleted,
        operation: 'findByUserId'
      });

      return todos.map(todo => this.toDomainTodo(todo));
    } catch (error) {
      this.appContext.logger.error('Failed to find todos by user ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        operation: 'findByUserId',
        repository: 'MongoTodoRepository'
      });
      throw error;
    }
  }

  async findByStatus(userId: string, completed: boolean): Promise<Todo[]> {
    try {
      const userObjectId = this.parseObjectId(userId);

      const filter: any = {
        userId: userObjectId,
        completed,
        deletedAt: { $exists: false }
      };

      const todos = await this.collection.find(filter, { sort: { createdAt: -1 } });

      this.appContext.logger.info('Found todos by status', {
        userId,
        completed,
        count: todos.length,
        operation: 'findByStatus'
      });

      return todos.map(todo => this.toDomainTodo(todo));
    } catch (error) {
      this.appContext.logger.error('Failed to find todos by status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        completed,
        operation: 'findByStatus',
        repository: 'MongoTodoRepository'
      });
      throw error;
    }
  }

  async countByUserId(userId: string, filter?: { completed?: boolean }): Promise<number> {
    try {
      const userObjectId = this.parseObjectId(userId);

      const mongoFilter: any = {
        userId: userObjectId,
        deletedAt: { $exists: false }
      };

      if (filter?.completed !== undefined) {
        mongoFilter.completed = filter.completed;
      }

      const count = await this.collection.count(mongoFilter);

      this.appContext.logger.info('Counted todos for user', {
        userId,
        count,
        filter,
        operation: 'countByUserId'
      });

      return count;
    } catch (error) {
      this.appContext.logger.error('Failed to count todos by user ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        operation: 'countByUserId',
        repository: 'MongoTodoRepository'
      });
      throw error;
    }
  }

  async findAll(filter: TodoFilterQuery): Promise<Todo[]> {
    try {
      const mongoFilter: any = {
        deletedAt: { $exists: false }
      };

      if (filter.userId) {
        mongoFilter.userId = this.parseObjectId(filter.userId);
      }
      if (filter.completed !== undefined) {
        mongoFilter.completed = filter.completed;
      }
      if (filter.title) {
        mongoFilter.title = { $regex: filter.title, $options: 'i' };
      }

      const queryOptions: any = {};
      
      if (filter.sort) {
        queryOptions.sort = filter.sort;
      } else {
        queryOptions.sort = { createdAt: -1 };
      }

      if (filter.skip) {
        queryOptions.skip = filter.skip;
      }
      if (filter.limit) {
        queryOptions.limit = filter.limit;
      }

      const todos = await this.collection.find(mongoFilter, queryOptions);

      this.appContext.logger.info('Found todos with filter', {
        filter,
        count: todos.length,
        operation: 'findAll'
      });

      return todos.map(todo => this.toDomainTodo(todo));
    } catch (error) {
      this.appContext.logger.error('Failed to find todos with filter', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filter,
        operation: 'findAll',
        repository: 'MongoTodoRepository'
      });
      throw error;
    }
  }
}