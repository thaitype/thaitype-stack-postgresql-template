import type { Todo } from '~/server/domain/models';
import type { RepositoryContext } from '~/server/lib/constants';
import type {
  TodoCreateRequest,
  TodoContentPartialUpdate,
  TodoStatusUpdate,
  TodoTitleUpdate,
  TodoDescriptionUpdate,
  TodoFilterQuery,
} from './types/todo-repository-types';

/**
 * Repository interface for Todo operations
 * Following Entity-Based Repository Architecture with dedicated methods
 * 
 * Architecture principles:
 * 1. Dedicated methods over generic operations
 * 2. Repository as single validation point
 * 3. Type safety with entity-derived types
 * 4. Clear operation boundaries
 * 5. User-scoped operations for security
 */
export interface ITodoRepository {
  // =============================================================================
  // BASIC CRUD OPERATIONS
  // =============================================================================
  
  /**
   * Create a new todo record
   */
  create(input: TodoCreateRequest, context: RepositoryContext): Promise<Todo>;

  /**
   * Find todo by ID (user-scoped for security)
   */
  findById(id: string, userId: string): Promise<Todo | null>;

  /**
   * Delete todo record (soft delete)
   */
  delete(id: string, userId: string, context: RepositoryContext): Promise<void>;

  // =============================================================================
  // DEDICATED UPDATE METHODS (No generic update!)
  // =============================================================================
  
  /**
   * Update todo content (title and description)
   */
  updateContent(id: string, input: TodoContentPartialUpdate, userId: string, context: RepositoryContext): Promise<void>;

  /**
   * Update todo completion status
   */
  updateStatus(id: string, input: TodoStatusUpdate, userId: string, context: RepositoryContext): Promise<void>;

  /**
   * Update todo title only
   */
  updateTitle(id: string, input: TodoTitleUpdate, userId: string, context: RepositoryContext): Promise<void>;

  /**
   * Update todo description only
   */
  updateDescription(id: string, input: TodoDescriptionUpdate, userId: string, context: RepositoryContext): Promise<void>;

  /**
   * Toggle todo completion status
   */
  toggleCompletion(id: string, userId: string, context: RepositoryContext): Promise<Todo>;

  // =============================================================================
  // QUERY OPERATIONS
  // =============================================================================
  
  /**
   * Find all todos for a user with filtering and pagination
   */
  findByUserId(
    userId: string,
    options?: {
      includeCompleted?: boolean;
      limit?: number;
      skip?: number;
      sort?: Record<string, 1 | -1>;
    }
  ): Promise<Todo[]>;

  /**
   * Find todos by completion status for a user
   */
  findByStatus(userId: string, completed: boolean): Promise<Todo[]>;

  /**
   * Count todos for a user with filtering
   */
  countByUserId(userId: string, filter?: { completed?: boolean }): Promise<number>;

  /**
   * Find all todos with advanced filtering (admin use)
   */
  findAll(filter: TodoFilterQuery): Promise<Todo[]>;
}