/**
 * Drizzle Todo Repository - Entity-Based Architecture
 * 
 * This implementation follows the definitive repository design rules:
 * 1. Repository methods accept clear entity subset types (not unknown)
 * 2. Validation happens inside repository using Zod schemas
 * 3. Schema output must match input type exactly using matches<T>()
 * 4. UUID validation handled in schemas and base repository
 * 5. Explicit Drizzle operations with type-safe queries
 * 6. Consistent naming convention
 */

import type { AppContext } from '~/server/context/app-context';
import type { ITodoRepository, Todo } from '~/server/domain';
import { eq, and, desc, asc, count } from 'drizzle-orm';
import { BaseDrizzleRepository } from './base-drizzle-repository';
import { todos } from '~/server/infrastructure/db/schema';
import * as Err from '~/server/lib/errors/domain-errors';

// Import validation schemas
import {
  RepoTodoCreateSchema,
  RepoTodoContentUpdateSchema,
  RepoTodoStatusUpdateSchema,
  RepoTodoTitleUpdateSchema,
  RepoTodoDescriptionUpdateSchema,
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

export class DrizzleTodoRepository extends BaseDrizzleRepository<Todo> implements ITodoRepository {
  constructor(private appContext: AppContext) {
    super('todos');
  }

  protected getLogger() {
    return this.appContext.logger;
  }

  /**
   * Convert database entity to domain model
   */
  private toDomainTodo(dbTodo: typeof todos.$inferSelect): Todo {
    return {
      id: dbTodo.id,
      title: dbTodo.title,
      description: dbTodo.description,
      completed: dbTodo.completed,
      userId: dbTodo.userId,
      createdAt: dbTodo.createdAt,
      updatedAt: dbTodo.updatedAt,
    };
  }

  async create(input: TodoCreateRequest): Promise<Todo> {
    try {
      this.appContext.logger.info('Creating todo in repository', {
        title: input.title,
        userId: input.userId,
        operation: 'create',
        repository: 'DrizzleTodoRepository'
      });

      // Validation happens here in repository
      const validatedData = RepoTodoCreateSchema.parse(input);

      const newTodo = {
        title: validatedData.title,
        description: validatedData.description,
        completed: false,
        userId: validatedData.userId,
      };

      // Ensure database is initialized
      const db = await this.ensureDatabase();

      const createdTodos = await db.insert(todos).values(newTodo).returning();
      const createdTodo = createdTodos[0];

      if (!createdTodo) {
        throw new Err.DatabaseError('Failed to create todo - no data returned');
      }

      this.appContext.logger.info('Todo created successfully in repository', {
        todoId: createdTodo.id,
        title: validatedData.title,
        operation: 'create'
      });

      return this.toDomainTodo(createdTodo);
    } catch (error) {
      this.appContext.logger.error('Failed to create todo', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: input.userId,
        operation: 'create',
        repository: 'DrizzleTodoRepository'
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
        repository: 'DrizzleTodoRepository'
      });

      const db = await this.ensureDatabase();

      // Find todo by ID and user ID
      const todo = await db
        .select()
        .from(todos)
        .where(
          and(
            eq(todos.id, id),
            eq(todos.userId, userId)
          )
        )
        .limit(1);
      
      if (todo.length === 0) {
        this.appContext.logger.info('Todo not found or not accessible', {
          todoId: id,
          userId,
          operation: 'findById'
        });
        return null;
      }

      return this.toDomainTodo(todo[0]);
    } catch (error) {
      this.appContext.logger.error('Failed to find todo by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId: id,
        userId,
        operation: 'findById',
        repository: 'DrizzleTodoRepository'
      });
      throw error;
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      this.appContext.logger.info('Deleting todo', {
        todoId: id,
        userId,
        operation: 'delete',
        repository: 'DrizzleTodoRepository'
      });

      const db = await this.ensureDatabase();

      // First verify the todo exists and belongs to user
      const existingTodo = await db
        .select()
        .from(todos)
        .where(
          and(
            eq(todos.id, id),
            eq(todos.userId, userId)
          )
        )
        .limit(1);

      if (existingTodo.length === 0) {
        throw new Err.NotFoundError(`Todo not found or not owned by user: ${id}`);
      }

      // Perform hard delete
      await db
        .delete(todos)
        .where(eq(todos.id, id));

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
        repository: 'DrizzleTodoRepository'
      });
      throw error;
    }
  }

  async updateContent(id: string, input: TodoContentPartialUpdate, userId: string): Promise<void> {
    try {
      const validatedData = RepoTodoContentUpdateSchema.parse(input);
      
      const db = await this.ensureDatabase();

      // First verify the todo exists and belongs to user
      const existingTodo = await db
        .select()
        .from(todos)
        .where(
          and(
            eq(todos.id, id),
            eq(todos.userId, userId)
          )
        )
        .limit(1);

      if (existingTodo.length === 0) {
        throw new Err.NotFoundError(`Todo not found or not owned by user: ${id}`);
      }

      const updateFields: any = {};
      if (validatedData.title !== undefined) updateFields.title = validatedData.title;
      if (validatedData.description !== undefined) updateFields.description = validatedData.description;

      await db
        .update(todos)
        .set(updateFields)
        .where(eq(todos.id, id));

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
        repository: 'DrizzleTodoRepository'
      });
      throw error;
    }
  }

  async updateStatus(id: string, input: TodoStatusUpdate, userId: string): Promise<void> {
    try {
      const validatedData = RepoTodoStatusUpdateSchema.parse(input);
      
      const db = await this.ensureDatabase();

      // First verify the todo exists and belongs to user
      const existingTodo = await db
        .select()
        .from(todos)
        .where(
          and(
            eq(todos.id, id),
            eq(todos.userId, userId)
          )
        )
        .limit(1);

      if (existingTodo.length === 0) {
        throw new Err.NotFoundError(`Todo not found or not owned by user: ${id}`);
      }

      const updateFields = { completed: validatedData.completed };

      await db
        .update(todos)
        .set(updateFields)
        .where(eq(todos.id, id));

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
        repository: 'DrizzleTodoRepository'
      });
      throw error;
    }
  }

  async updateTitle(id: string, input: TodoTitleUpdate, userId: string): Promise<void> {
    try {
      const validatedData = RepoTodoTitleUpdateSchema.parse(input);
      
      const db = await this.ensureDatabase();

      // First verify the todo exists and belongs to user
      const existingTodo = await db
        .select()
        .from(todos)
        .where(
          and(
            eq(todos.id, id),
            eq(todos.userId, userId)
          )
        )
        .limit(1);

      if (existingTodo.length === 0) {
        throw new Err.NotFoundError(`Todo not found or not owned by user: ${id}`);
      }

      const updateFields = { title: validatedData.title };

      await db
        .update(todos)
        .set(updateFields)
        .where(eq(todos.id, id));

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
        repository: 'DrizzleTodoRepository'
      });
      throw error;
    }
  }

  async updateDescription(id: string, input: TodoDescriptionUpdate, userId: string): Promise<void> {
    try {
      const validatedData = RepoTodoDescriptionUpdateSchema.parse(input);
      
      const db = await this.ensureDatabase();

      // First verify the todo exists and belongs to user
      const existingTodo = await db
        .select()
        .from(todos)
        .where(
          and(
            eq(todos.id, id),
            eq(todos.userId, userId)
          )
        )
        .limit(1);

      if (existingTodo.length === 0) {
        throw new Err.NotFoundError(`Todo not found or not owned by user: ${id}`);
      }

      const updateFields = { description: validatedData.description };

      await db
        .update(todos)
        .set(updateFields)
        .where(eq(todos.id, id));

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
        repository: 'DrizzleTodoRepository'
      });
      throw error;
    }
  }

  async toggleCompletion(id: string, userId: string): Promise<Todo> {
    try {
      const db = await this.ensureDatabase();

      // First, get the current todo to know its status
      const currentTodo = await db
        .select()
        .from(todos)
        .where(
          and(
            eq(todos.id, id),
            eq(todos.userId, userId)
          )
        )
        .limit(1);

      if (currentTodo.length === 0) {
        throw new Err.NotFoundError(`Todo not found or not owned by user: ${id}`);
      }

      const newCompletedStatus = !currentTodo[0].completed;
      const updateFields = { completed: newCompletedStatus };

      const updatedTodos = await db
        .update(todos)
        .set(updateFields)
        .where(eq(todos.id, id))
        .returning();

      const updatedTodo = updatedTodos[0];
      if (!updatedTodo) {
        throw new Err.DatabaseError('Failed to retrieve updated todo');
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
        repository: 'DrizzleTodoRepository'
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
      const db = await this.ensureDatabase();

      let query = db
        .select()
        .from(todos)
        .where(eq(todos.userId, userId));

      // Filter by completion status if specified
      if (options?.includeCompleted === false) {
        query = query.where(
          and(
            eq(todos.userId, userId),
            eq(todos.completed, false)
          )
        );
      }

      // Apply sorting (default to newest first)
      if (options?.sort?.createdAt === -1) {
        query = query.orderBy(desc(todos.createdAt));
      } else if (options?.sort?.createdAt === 1) {
        query = query.orderBy(asc(todos.createdAt));
      } else {
        query = query.orderBy(desc(todos.createdAt));
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.skip) {
        query = query.offset(options.skip);
      }

      const todoList = await query;

      this.appContext.logger.info('Found todos for user', {
        userId,
        count: todoList.length,
        includeCompleted: options?.includeCompleted,
        operation: 'findByUserId'
      });

      return todoList.map(todo => this.toDomainTodo(todo));
    } catch (error) {
      this.appContext.logger.error('Failed to find todos by user ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        operation: 'findByUserId',
        repository: 'DrizzleTodoRepository'
      });
      throw error;
    }
  }

  async findByStatus(userId: string, completed: boolean): Promise<Todo[]> {
    try {
      const db = await this.ensureDatabase();

      const todoList = await db
        .select()
        .from(todos)
        .where(
          and(
            eq(todos.userId, userId),
            eq(todos.completed, completed)
          )
        )
        .orderBy(desc(todos.createdAt));

      this.appContext.logger.info('Found todos by status', {
        userId,
        completed,
        count: todoList.length,
        operation: 'findByStatus'
      });

      return todoList.map(todo => this.toDomainTodo(todo));
    } catch (error) {
      this.appContext.logger.error('Failed to find todos by status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        completed,
        operation: 'findByStatus',
        repository: 'DrizzleTodoRepository'
      });
      throw error;
    }
  }

  async countByUserId(userId: string, filter?: { completed?: boolean }): Promise<number> {
    try {
      const db = await this.ensureDatabase();

      let whereCondition = eq(todos.userId, userId);

      if (filter?.completed !== undefined) {
        whereCondition = and(
          eq(todos.userId, userId),
          eq(todos.completed, filter.completed)
        );
      }

      const result = await db
        .select({ count: count() })
        .from(todos)
        .where(whereCondition);

      const todoCount = result[0]?.count ?? 0;

      this.appContext.logger.info('Counted todos for user', {
        userId,
        count: todoCount,
        filter,
        operation: 'countByUserId'
      });

      return todoCount;
    } catch (error) {
      this.appContext.logger.error('Failed to count todos by user ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        operation: 'countByUserId',
        repository: 'DrizzleTodoRepository'
      });
      throw error;
    }
  }

  async findAll(filter: TodoFilterQuery): Promise<Todo[]> {
    try {
      const db = await this.ensureDatabase();

      let whereConditions = [];

      if (filter.userId) {
        whereConditions.push(eq(todos.userId, filter.userId));
      }
      if (filter.completed !== undefined) {
        whereConditions.push(eq(todos.completed, filter.completed));
      }

      let query = db
        .select()
        .from(todos);

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      // Apply sorting
      if (filter.sort?.createdAt === -1) {
        query = query.orderBy(desc(todos.createdAt));
      } else if (filter.sort?.createdAt === 1) {
        query = query.orderBy(asc(todos.createdAt));
      } else {
        query = query.orderBy(desc(todos.createdAt));
      }

      // Apply pagination
      if (filter.skip) {
        query = query.offset(filter.skip);
      }
      if (filter.limit) {
        query = query.limit(filter.limit);
      }

      const todoList = await query;

      this.appContext.logger.info('Found todos with filter', {
        filter,
        count: todoList.length,
        operation: 'findAll'
      });

      return todoList.map(todo => this.toDomainTodo(todo));
    } catch (error) {
      this.appContext.logger.error('Failed to find todos with filter', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filter,
        operation: 'findAll',
        repository: 'DrizzleTodoRepository'
      });
      throw error;
    }
  }
}