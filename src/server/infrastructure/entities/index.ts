/**
 * Entity definitions using Drizzle schema types
 * 
 * This file now re-exports the database schema types as entities.
 * This maintains backward compatibility while using Drizzle as the source of truth.
 */

// Re-export database schema types as entity types
export type {
  DbUserEntity,
  DbUserInsert,
  DbUserUpdate,
  DbTodoEntity,
  DbTodoInsert,
  DbTodoUpdate,
} from '../db/schema';

// Re-export domain model types for service layer
export type { User, Todo } from '../db/schema';
