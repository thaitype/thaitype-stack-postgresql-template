import { pgTable, varchar, text, uuid, unique } from 'drizzle-orm/pg-core';
import { baseFields, type BaseFields } from './base';
import { users } from './users';

/**
 * Roles table - Master data for user roles
 */
export const roles = pgTable('roles', {
  ...baseFields,
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
});

/**
 * User-Roles junction table - Many-to-many relationship between users and roles
 */
export const userRoles = pgTable('user_roles', {
  ...baseFields,
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, (table) => ({
  // Ensure each user can only have each role once
  uniqueUserRole: unique().on(table.userId, table.roleId),
}));

/**
 * Database entity types following entity-based architecture naming convention
 */
export type DbRoleEntity = typeof roles.$inferSelect;
export type DbRoleInsert = typeof roles.$inferInsert;
export type DbUserRoleEntity = typeof userRoles.$inferSelect;
export type DbUserRoleInsert = typeof userRoles.$inferInsert;

/**
 * Domain role model - for service layer (string-based IDs)
 */
export interface Role extends BaseFields {
  name: string;
  description?: string | null;
}