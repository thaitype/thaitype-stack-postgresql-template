/**
 * Todo Repository Zod Schemas
 * 
 * This file defines Zod validation schemas for Todo repository operations.
 * All schemas use matches<T>() utility to ensure runtime validation aligns with TypeScript types.
 * 
 * Key features:
 * 1. Type-safe validation with matches<T>() alignment
 * 2. Runtime safety for all repository operations
 * 3. UUID validation for string-based IDs
 */

import { z } from 'zod';
import { matches, commonValidation } from '~/server/lib/validation/zod-utils';
import type { DbTodoEntity } from '~/server/infrastructure/entities';

// =============================================================================
// INTERNAL REPOSITORY SCHEMA TYPES (for database operations)
// =============================================================================

/**
 * Internal repository create data type (for database operations)
 * Derives from DbTodoEntity to ensure type safety
 */
type RepoTodoCreateData = Omit<DbTodoEntity, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Internal content update data type
 */
type RepoTodoContentUpdateData = Partial<Pick<DbTodoEntity, 'title' | 'description'>>;

/**
 * Internal status update data type
 */
type RepoTodoStatusUpdateData = Pick<DbTodoEntity, 'completed'>;

/**
 * Internal title update data type
 */
type RepoTodoTitleUpdateData = Pick<DbTodoEntity, 'title'>;

/**
 * Internal description update data type
 */
type RepoTodoDescriptionUpdateData = Pick<DbTodoEntity, 'description'>;

// =============================================================================
// TODO CREATE SCHEMAS
// =============================================================================

/**
 * Schema for creating todos
 * Validates all required fields for todo creation
 */
export const RepoTodoCreateSchema = matches<RepoTodoCreateData>()(
  z.object({
    title: commonValidation.nonEmptyString.max(200, 'Title too long'),
    description: z.string().max(1000, 'Description too long').nullable().optional().transform(val => val ?? null),
    userId: z.string().uuid('Invalid user ID format'),
    completed: z.boolean().default(false),
  })
);

// =============================================================================
// TODO UPDATE SCHEMAS
// =============================================================================

/**
 * Schema for updating todo content (title and description)
 */
export const RepoTodoContentUpdateSchema = matches<RepoTodoContentUpdateData>()(
  z.object({
    title: commonValidation.nonEmptyString.max(200, 'Title too long').optional(),
    description: z.string().max(1000, 'Description too long').nullable().optional(),
  }).partial()
);

/**
 * Schema for updating todo completion status
 */
export const RepoTodoStatusUpdateSchema = matches<RepoTodoStatusUpdateData>()(
  z.object({
    completed: z.boolean(),
  })
);

/**
 * Schema for updating todo title only
 */
export const RepoTodoTitleUpdateSchema = matches<RepoTodoTitleUpdateData>()(
  z.object({
    title: commonValidation.nonEmptyString.max(200, 'Title too long'),
  })
);

/**
 * Schema for updating todo description only
 */
export const RepoTodoDescriptionUpdateSchema = matches<RepoTodoDescriptionUpdateData>()(
  z.object({
    description: z.string().max(1000, 'Description too long').nullable(),
  })
);

// =============================================================================
// QUERY VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for validating UUID parameters
 */
export const RepoUuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Schema for validating user queries with pagination
 */
export const RepoTodoUserQuerySchema = z.object({
  userId: RepoUuidSchema,
  includeCompleted: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
  sort: z.record(z.enum(['asc', 'desc'])).optional(),
});

/**
 * Schema for validating todo status queries
 */
export const RepoTodoStatusQuerySchema = z.object({
  userId: RepoUuidSchema,
  completed: z.boolean(),
});