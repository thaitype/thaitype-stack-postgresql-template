import { boolean, pgEnum, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { baseFields, type BaseFields } from './base';

/**
 * User roles enumeration
 */
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);

/**
 * Users table schema with minimal fields
 */
export const users = pgTable('users', {
  ...baseFields,
  
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  roles: userRoleEnum('roles').array().notNull().default(['user']),
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
 */
export interface User extends BaseFields {
  email: string;
  name: string;
  roles: ('admin' | 'user')[];
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
  isActive: boolean;
}