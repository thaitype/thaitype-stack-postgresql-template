/**
 * Database Schema Exports
 * 
 * Central export point for all database schemas, types, and relations.
 * This follows the entity-based repository pattern where database schemas
 * are the single source of truth for all type derivations.
 */

// Schema tables
export { users, userRoleEnum } from './users';
export { todos, todosRelations } from './todos';
export { auditLogs, auditEventTypeEnum } from './audit-logs';

// Database entity types (with database-specific fields)
export type { DbUserEntity, DbUserInsert, DbUserUpdate } from './users';
export type { DbTodoEntity, DbTodoInsert, DbTodoUpdate } from './todos';
export type { DbAuditLogEntity, DbAuditLogInsert } from './audit-logs';

// Domain model types (for service layer - string-based IDs)
export type { User } from './users';
export type { Todo } from './todos';

// Base audit types
export type { AuditFields } from './base';
export { auditFields, updateUpdatedAtTrigger, createUpdateTrigger } from './base';

// Composite schema for Drizzle client
export const schema = {
  users,
  todos,
  todosRelations,
  auditLogs,
} as const;