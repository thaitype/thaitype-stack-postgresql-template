import { boolean, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { baseFields, type BaseFields } from './base';

/**
 * Users table schema with minimal fields
 * Roles are now normalized in separate roles/userRoles tables
 */
export const users = pgTable('users', {
  ...baseFields,
  
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  bio: text('bio'),
  avatar: text('avatar'),
  website: text('website'),
  isActive: boolean('is_active').notNull().default(true),
});

/**
 * User entity type - matches the database schema exactly
 */
export type DbUserEntity = typeof users.$inferSelect;

/**
 * User insert type - for creating new users
 */
export type DbUserInsert = typeof users.$inferInsert;

/**
 * User update type - for updating existing users
 */
export type DbUserUpdate = Partial<Omit<DbUserEntity, 'id' | 'createdAt'>>;

/**
 * Domain user model - string-based for service layer
 * Roles are fetched via JOINs and aggregated as string array
 */
export interface User extends BaseFields {
  email: string;
  name: string;
  roles: string[];
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
  isActive: boolean;
}