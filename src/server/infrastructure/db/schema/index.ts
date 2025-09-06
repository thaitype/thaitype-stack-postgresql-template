/**
 * Database Schema Exports
 * 
 * Central export point for all database schemas, types, and relations.
 * This follows the entity-based repository pattern where database schemas
 * are the single source of truth for all type derivations.
 */

// Schema tables
export { users } from './users';
export { todos, todosRelations } from './todos';
export { roles, userRoles } from './roles';

// Re-import for schema object
import { users } from './users';
import { todos, todosRelations } from './todos';
import { roles, userRoles } from './roles';

// Database entity types (with database-specific fields)
export type { DbUserEntity, DbUserInsert, DbUserUpdate } from './users';
export type { DbTodoEntity, DbTodoInsert, DbTodoUpdate } from './todos';
export type { DbRoleEntity, DbRoleInsert, DbUserRoleEntity, DbUserRoleInsert } from './roles';

// Domain model types (for service layer - string-based IDs)
export type { User } from './users';
export type { Todo } from './todos';
export type { Role } from './roles';

// Base types
export type { BaseFields } from './base';
export { baseFields } from './base';

// Composite schema for Drizzle client
export const schema = {
  users,
  todos,
  todosRelations,
  roles,
  userRoles,
} as const;