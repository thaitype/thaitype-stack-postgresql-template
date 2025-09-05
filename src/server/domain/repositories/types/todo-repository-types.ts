/**
 * Todo Repository Types
 * 
 * This file defines all repository-specific types derived from the DbTodoEntity.
 * All types are strict subsets of the database schema using Pick<>, Partial<>, and Omit<>.
 * 
 * Key principles:
 * 1. Single source of truth: All types derive from ~/server/infrastructure/entities
 * 2. Type safety: No manual type definitions that could drift from entity schema
 * 3. Explicit operations: Each type represents a specific database operation
 */

import type { DbTodoEntity } from '~/server/infrastructure/entities';

// =============================================================================
// TODO CRUD TYPES
// =============================================================================

/**
 * Data required to create a new todo record
 * Omits auto-generated fields: _id, createdAt, updatedAt, deletedAt
 * userId uses string (domain type) instead of ObjectId
 */
export type TodoCreateData = Omit<DbTodoEntity, '_id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'userId'> & {
  userId: string;
};

/**
 * Full todo data with all fields (for domain layer responses)
 * Maps to the complete todo entity structure with string userId
 */
export type TodoFullData = Omit<DbTodoEntity, 'userId'> & {
  userId: string;
};

// =============================================================================
// TODO UPDATE TYPES - Dedicated Methods
// =============================================================================

/**
 * Update todo content (title and description)
 * Used by: updateContent() repository method
 */
export type TodoContentUpdate = Pick<DbTodoEntity, 'title' | 'description'>;

/**
 * Partial content update (for optional field changes)
 * Used by: updateContent() repository method when fields might be undefined
 */
export type TodoContentPartialUpdate = Partial<TodoContentUpdate>;

/**
 * Update todo completion status
 * Used by: updateStatus() repository method
 */
export type TodoStatusUpdate = Pick<DbTodoEntity, 'completed'>;

/**
 * Update todo title only
 * Used by: updateTitle() repository method
 */
export type TodoTitleUpdate = Pick<DbTodoEntity, 'title'>;

/**
 * Update todo description only
 * Used by: updateDescription() repository method
 */
export type TodoDescriptionUpdate = Pick<DbTodoEntity, 'description'>;

// =============================================================================
// TODO QUERY TYPES
// =============================================================================

/**
 * Query parameters for finding todos by completion status
 * Used by: findByStatus() repository method
 */
export type TodoStatusQuery = {
  completed: boolean;
  userId: string;
};

/**
 * Query parameters for finding todos by user
 * Used by: findByUserId() repository method
 */
export type TodoUserQuery = {
  userId: string;
  includeCompleted?: boolean;
};

/**
 * Query parameters for todo filtering and pagination
 * Used by: findAll() repository method
 */
export type TodoFilterQuery = {
  userId?: string;
  completed?: boolean;
  title?: string;
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
};

// =============================================================================
// TODO SPECIALIZED TYPES
// =============================================================================

/**
 * Create todo request (domain types for service layer)
 * Used by: create() repository method
 */
export type TodoCreateRequest = {
  title: string;
  description?: string;
  userId: string;
};

/**
 * Update todo request (domain types for service layer)
 * Used by: updateTodo() service method - combines multiple update operations
 */
export type TodoUpdateRequest = {
  title?: string;
  description?: string;
  completed?: boolean;
};

/**
 * Toggle todo completion request
 * Used by: toggleCompletion() service method
 */
export type TodoToggleRequest = {
  id: string;
  userId: string;
};

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Type guards for todo operations
 */
export type TodoOperationType = 
  | 'create'
  | 'updateContent'
  | 'updateStatus'
  | 'updateTitle'
  | 'updateDescription'
  | 'delete'
  | 'findByStatus'
  | 'findByUserId'
  | 'toggleCompletion';

/**
 * Todo validation context
 */
export type TodoValidationContext = {
  operation: TodoOperationType;
  userId: string;
  todoId?: string;
  targetUserId?: string;
};