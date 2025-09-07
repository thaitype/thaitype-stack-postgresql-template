/**
 * Todo Service - Business Logic Layer
 * 
 * This service provides business logic for todo operations and serves as the
 * interface between tRPC controllers and the repository layer.
 * 
 * Key responsibilities:
 * 1. Business logic and validation
 * 2. Authorization and permission checking
 * 3. Coordination between multiple repositories if needed
 * 4. Error handling and logging
 * 5. Data transformation for the API layer
 */

import type { AppContext } from '~/server/context/app-context';
import type { ITodoRepository, Todo } from '~/server/domain';
import * as Err from '~/server/lib/errors/domain-errors';

export interface CreateTodoRequest {
  title: string;
  description?: string;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
}

export interface TodoListOptions {
  includeCompleted?: boolean;
  limit?: number;
  skip?: number;
}

export class TodoService {
  constructor(
    private appContext: AppContext,
    private todoRepository: ITodoRepository
  ) {}

  /**
   * Create a new todo for a user
   */
  async createTodo(userId: string, request: CreateTodoRequest): Promise<Todo> {
    try {
      this.appContext.logger.info('Creating todo', {
        userId,
        title: request.title,
        operation: 'createTodo',
        service: 'TodoService'
      });

      // Validate input
      if (!request.title.trim()) {
        throw new Err.ValidationError('Title is required', {
          field: 'title',
          value: request.title
        });
      }

      if (request.title.length > 200) {
        throw new Err.ValidationError('Title too long', {
          field: 'title',
          maxLength: 200,
          currentLength: request.title.length
        });
      }

      if (request.description && request.description.length > 1000) {
        throw new Err.ValidationError('Description too long', {
          field: 'description',
          maxLength: 1000,
          currentLength: request.description.length
        });
      }

      const todo = await this.todoRepository.create({
        title: request.title.trim(),
        description: request.description?.trim(),
        userId
      });

      this.appContext.logger.info('Todo created successfully', {
        todoId: todo.id,
        userId,
        operation: 'createTodo'
      });

      return todo;
    } catch (error) {
      this.appContext.logger.error('Failed to create todo', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        title: request.title,
        operation: 'createTodo',
        service: 'TodoService'
      });
      throw error;
    }
  }

  /**
   * Get todos for a user with filtering options
   */
  async getTodos(userId: string, options: TodoListOptions = {}): Promise<Todo[]> {
    try {
      this.appContext.logger.info('Fetching todos for user', {
        userId,
        options,
        operation: 'getTodos',
        service: 'TodoService'
      });

      const todos = await this.todoRepository.findByUserId(userId, {
        includeCompleted: options.includeCompleted,
        limit: options.limit,
        skip: options.skip,
        sort: { createdAt: -1 } // Newest first
      });

      this.appContext.logger.info('Todos fetched successfully', {
        userId,
        count: todos.length,
        operation: 'getTodos'
      });

      return todos;
    } catch (error) {
      this.appContext.logger.error('Failed to fetch todos', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        operation: 'getTodos',
        service: 'TodoService'
      });
      throw error;
    }
  }

  /**
   * Get a single todo by ID (user-scoped for security)
   */
  async getTodoById(todoId: string, userId: string): Promise<Todo | null> {
    try {
      this.appContext.logger.info('Fetching todo by ID', {
        todoId,
        userId,
        operation: 'getTodoById',
        service: 'TodoService'
      });

      const todo = await this.todoRepository.findById(todoId, userId);
      
      if (!todo) {
        this.appContext.logger.info('Todo not found', {
          todoId,
          userId,
          operation: 'getTodoById'
        });
        return null;
      }

      return todo;
    } catch (error) {
      this.appContext.logger.error('Failed to fetch todo by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId,
        userId,
        operation: 'getTodoById',
        service: 'TodoService'
      });
      throw error;
    }
  }

  /**
   * Update a todo (user-scoped for security)
   */
  async updateTodo(todoId: string, userId: string, request: UpdateTodoRequest): Promise<void> {
    try {
      this.appContext.logger.info('Updating todo', {
        todoId,
        userId,
        updates: request,
        operation: 'updateTodo',
        service: 'TodoService'
      });

      // Validate the todo exists and belongs to the user
      const existingTodo = await this.todoRepository.findById(todoId, userId);
      if (!existingTodo) {
        throw new Err.NotFoundError(`Todo not found or not owned by user: ${todoId}`);
      }

      // Validate input if provided
      if (request.title !== undefined) {
        if (!request.title.trim()) {
          throw new Err.ValidationError('Title is required', {
            field: 'title',
            value: request.title
          });
        }
        if (request.title.length > 200) {
          throw new Err.ValidationError('Title too long', {
            field: 'title',
            maxLength: 200,
            currentLength: request.title.length
          });
        }
      }

      if (request.description !== undefined && request.description.length > 1000) {
        throw new Err.ValidationError('Description too long', {
          field: 'description',
          maxLength: 1000,
          currentLength: request.description.length
        });
      }

      // Update content if title or description changed
      if (request.title !== undefined || request.description !== undefined) {
        await this.todoRepository.updateContent(todoId, {
          title: request.title?.trim(),
          description: request.description?.trim()
        }, userId);
      }

      // Update status if changed
      if (request.completed !== undefined) {
        await this.todoRepository.updateStatus(todoId, {
          completed: request.completed
        }, userId);
      }

      this.appContext.logger.info('Todo updated successfully', {
        todoId,
        userId,
        operation: 'updateTodo'
      });
    } catch (error) {
      this.appContext.logger.error('Failed to update todo', {
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId,
        userId,
        operation: 'updateTodo',
        service: 'TodoService'
      });
      throw error;
    }
  }

  /**
   * Toggle completion status of a todo
   */
  async toggleTodo(todoId: string, userId: string): Promise<Todo> {
    try {
      this.appContext.logger.info('Toggling todo completion', {
        todoId,
        userId,
        operation: 'toggleTodo',
        service: 'TodoService'
      });

      const updatedTodo = await this.todoRepository.toggleCompletion(todoId, userId);

      this.appContext.logger.info('Todo toggled successfully', {
        todoId,
        userId,
        newStatus: updatedTodo.completed,
        operation: 'toggleTodo'
      });

      return updatedTodo;
    } catch (error) {
      this.appContext.logger.error('Failed to toggle todo', {
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId,
        userId,
        operation: 'toggleTodo',
        service: 'TodoService'
      });
      throw error;
    }
  }

  /**
   * Delete a todo (user-scoped for security)
   */
  async deleteTodo(todoId: string, userId: string): Promise<void> {
    try {
      this.appContext.logger.info('Deleting todo', {
        todoId,
        userId,
        operation: 'deleteTodo',
        service: 'TodoService'
      });

      await this.todoRepository.delete(todoId, userId);

      this.appContext.logger.info('Todo deleted successfully', {
        todoId,
        userId,
        operation: 'deleteTodo'
      });
    } catch (error) {
      this.appContext.logger.error('Failed to delete todo', {
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId,
        userId,
        operation: 'deleteTodo',
        service: 'TodoService'
      });
      throw error;
    }
  }

  /**
   * Get todo statistics for a user
   */
  async getTodoStats(userId: string): Promise<{ total: number; completed: number; pending: number }> {
    try {
      this.appContext.logger.info('Fetching todo statistics', {
        userId,
        operation: 'getTodoStats',
        service: 'TodoService'
      });

      const [total, completed] = await Promise.all([
        this.todoRepository.countByUserId(userId),
        this.todoRepository.countByUserId(userId, { completed: true })
      ]);

      const stats = {
        total,
        completed,
        pending: total - completed
      };

      this.appContext.logger.info('Todo statistics fetched successfully', {
        userId,
        stats,
        operation: 'getTodoStats'
      });

      return stats;
    } catch (error) {
      this.appContext.logger.error('Failed to fetch todo statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        operation: 'getTodoStats',
        service: 'TodoService'
      });
      throw error;
    }
  }
}