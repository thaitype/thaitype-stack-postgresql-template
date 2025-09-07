import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { baseFields, type BaseFields } from './base';

/**
 * Users table schema with minimal fields
 * Roles are now normalized in separate roles/userRoles tables
 */
export const user = pgTable('user', {
  /**
   * Using text for ID field due to Better Auth integration
   * Better Auth currently uses string IDs instead of UUIDs
   * See: https://www.better-auth.com/docs/concepts/database?utm_source=chatgpt.com#id-generation
   */
  id: text("id").primaryKey(),
  createdAt: baseFields.createdAt,
  updatedAt: baseFields.updatedAt,
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  // Extra profile fields
  image: text("image"),
  bio: text("bio"),
  avatar: text("avatar"),
  website: text("website"),
  // email: varchar('email', { length: 255 }).notNull().unique(),
  // name: varchar('name', { length: 255 }).notNull(),
  // bio: text('bio'),
  // avatar: text('avatar'),
  // website: text('website'),
  // isActive: boolean('is_active').notNull().default(true),
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