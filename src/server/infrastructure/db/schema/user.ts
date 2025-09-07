import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { baseFields, type BaseFields } from './base';

/**
 * Users table schema with minimal fields
 * Roles are now normalized in separate roles/userRoles tables
 */
export const user = pgTable('user', {
  ...baseFields,
  // Core fields required by Better Auth
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  // Extra profile fields
  image: text("image"),
  bio: text("bio"),
  avatar: text("avatar"),
  website: text("website"),
});

/**
 * User entity type - matches the database schema exactly
 */
export type DbUserEntity = typeof user.$inferSelect;

/**
 * User insert type - for creating new users
 */
export type DbUserInsert = typeof user.$inferInsert;

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
}