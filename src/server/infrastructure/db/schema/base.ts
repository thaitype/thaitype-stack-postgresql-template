import { timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Base fields for all entities using Drizzle native features
 * Automatic UUID generation and timestamp management
 */
export const baseFields = {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
} as const;

/**
 * Type helper to extract base field types
 */
export type BaseFields = {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};