import { boolean, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { baseFields, type BaseFields } from './base';
import { user } from './user';

/**
 * Todos table schema with minimal fields
 */
export const todos = pgTable('todos', {
  ...baseFields,
  
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  completed: boolean('completed').notNull().default(false),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

/**
 * Relations definition for type-safe joins
 */
export const todosRelations = relations(todos, ({ one }) => ({
  user: one(user, {
    fields: [todos.userId],
    references: [user.id],
  }),
}));

/**
 * Todo entity type - matches the database schema exactly
 */
export type DbTodoEntity = typeof todos.$inferSelect;

/**
 * Todo insert type - for creating new todos
 */
export type DbTodoInsert = typeof todos.$inferInsert;

/**
 * Todo update type - for updating existing todos
 */
export type DbTodoUpdate = Partial<Omit<DbTodoEntity, 'id' | 'createdAt' | 'userId'>>;

/**
 * Domain todo model - string-based for service layer
 */
export interface Todo extends BaseFields {
  title: string;
  description?: string | null;
  completed: boolean;
  userId: string;
}