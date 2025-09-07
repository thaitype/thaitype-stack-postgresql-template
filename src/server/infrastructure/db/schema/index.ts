/**
 * Database Schema Exports
 * 
 * Central export point for all database schemas, types, and relations.
 * This follows the entity-based repository pattern where database schemas
 * are the single source of truth for all type derivations.
 */

// Schema tables
export { user as users } from './user';
export { todos, todosRelations } from './todo';
export { roles, userRoles } from './role';
export { session, account, verification } from './auth';

// Re-import for schema object
import { user } from './user';
import { todos, todosRelations } from './todo';
import { roles, userRoles } from './role';
import { session, account, verification } from './auth';

// Database entity types (with database-specific fields)
export type { DbUserEntity, DbUserInsert, DbUserUpdate } from './user';
export type { DbTodoEntity, DbTodoInsert, DbTodoUpdate } from './todo';
export type { DbRoleEntity, DbRoleInsert, DbUserRoleEntity, DbUserRoleInsert } from './role';
export type { AuthUser, AuthUserInsert, AuthSession, AuthSessionInsert, AuthAccount, AuthAccountInsert, AuthVerification, AuthVerificationInsert } from './auth';

// Domain model types (for service layer - string-based IDs)
export type { User } from './user';
export type { Todo } from './todo';
export type { Role } from './role';

// Base types
export type { BaseFields } from './base';
export { baseFields } from './base';

// Composite schema for Drizzle client
export const schema = {
  todos,
  todosRelations,
  roles,
  userRoles,
  // Better Auth tables
  user,
  session,
  account,
  verification,
} as const;