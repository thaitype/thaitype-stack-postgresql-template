# Repository Design Pattern - Schema-Based Architecture

## Overview

Next.js API implements a **Schema-Based Repository Architecture** with PostgreSQL and Drizzle ORM that prioritizes type safety, clear interfaces, and separation of concerns. This pattern replaces traditional generic repository approaches with dedicated, strongly-typed methods that align directly with database schema definitions.

## Table of Contents

- [Core Principles](#core-principles)
- [Schema-Based Type System](#schema-based-type-system)
- [Validation Architecture](#validation-architecture)
- [Implementation Patterns](#implementation-patterns)
- [Service Integration](#service-integration)
- [Migration Guide](#migration-guide)
- [Best Practices](#best-practices)

## Core Principles

### 1. **Single Source of Truth**
All repository types derive from database schemas in `~/infrastructure/db/schema`. This prevents type drift and ensures consistency across the application.

```typescript
// ✅ CORRECT: Derive from database schema
export type TodoCreateData = Omit<DbTodoEntity, 'id' | 'createdAt' | 'updatedAt'>;

// ❌ FORBIDDEN: Manual type definitions
interface TodoCreateData {
  title: string;        // Could drift from DbTodoEntity
  description: string;  // Could become out of sync
}
```

### 2. **Dedicated Methods Over Generic Operations**
Each repository method handles ONE specific operation, replacing generic `update()` methods with explicit operations.

```typescript
// ✅ CORRECT: Explicit, dedicated methods
interface ITodoRepository {
  updateContent(id: string, input: TodoContentPartialUpdate): Promise<void>;
  updateStatus(id: string, input: TodoStatusUpdate): Promise<void>;
  updateTitle(id: string, input: TodoTitleUpdate): Promise<void>;
}

// ❌ FORBIDDEN: Generic update method
interface ITodoRepository {
  update(id: string, data: unknown): Promise<void>;
}
```

### 3. **Repository as Single Validation Point**
All input validation happens at the repository boundary using Zod schemas, ensuring runtime safety and proper error handling.

### 4. **Type Safety at Compile-Time and Runtime**
TypeScript provides compile-time safety, while Zod schemas provide runtime validation with automatic type inference.

## Schema-Based Type System

### Type Derivation Patterns

Our type system uses TypeScript's utility types to create precise subsets of database schemas:

```typescript
// Database schema (single source of truth)
export const todos = pgTable('todo', {
  ...baseFields,  // id (UUID), createdAt, updatedAt
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  completed: boolean('completed').notNull().default(false),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

// Inferred types from schema
export type DbTodoEntity = typeof todos.$inferSelect;
export type DbTodoInsert = typeof todos.$inferInsert;

// Repository types (derived from schema)
export type TodoCreateData = Omit<DbTodoEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type TodoContentUpdate = Pick<DbTodoEntity, 'title' | 'description'>;
export type TodoContentPartialUpdate = Partial<TodoContentUpdate>;
export type TodoStatusUpdate = Pick<DbTodoEntity, 'completed'>;
export type TodoTitleUpdate = Pick<DbTodoEntity, 'title'>;
```

### Schema Naming Convention

The project follows a consistent naming convention for database schemas:

- **Database Schemas**: Use Drizzle pgTable definitions (e.g., `todos`, `users`)
- **Inferred Types**: Use `Db` prefix + `Entity` suffix (e.g., `DbTodoEntity`, `DbUserEntity`)
- **Domain Models**: No prefix (e.g., `Todo`, `User` - for API/service layer)

```typescript
// ✅ Database schema definition
export const todos = pgTable('todo', {
  ...baseFields,  // Includes id (UUID), createdAt, updatedAt
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  completed: boolean('completed').notNull().default(false),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

// ✅ Domain model naming (for services/API)
export interface Todo {
  id: string;           // String representation of UUID
  title: string;
  description?: string | null;
  completed: boolean;
  userId: string;       // String representation of UUID
  createdAt: Date;
  updatedAt: Date;
}
```

### Benefits of Schema-Based Types

1. **🔒 Type Safety**: Impossible to use wrong field names or types
2. **🔄 Automatic Updates**: Schema changes automatically propagate to repository types
3. **📝 Self-Documenting**: Types clearly show what each operation affects
4. **🙅 Prevents Drift**: No manual type definitions that can become stale
5. **🏷️ Clear Naming**: Inferred types from Drizzle schemas provide consistency

## Validation Architecture

### Schema-Type Alignment

Every repository operation is protected by a Zod schema that exactly matches its TypeScript type using the `matches<T>()` utility:

```typescript
import { matches } from '~/lib/validation/zod-utils';

// Type definition
export type TodoContentPartialUpdate = Partial<Pick<DbTodoEntity, 'title' | 'description'>>;

// Aligned schema
export const RepoTodoContentUpdateSchema = matches<TodoContentPartialUpdate>()(
  z.object({
    title: commonValidation.nonEmptyString.max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
  }).partial()
);
```

### Runtime Validation Flow

```typescript
async updateContent(id: string, input: TodoContentPartialUpdate): Promise<void> {
  try {
    // ✅ Validation happens here in repository
    const validatedData = RepoTodoContentUpdateSchema.parse(input);
    
    // Drizzle operations with validated data
    await db.update(todos)
      .set(validatedData)
      .where(eq(todos.id, id));
    
    this.appContext.logger.info('Todo content updated successfully', {
      todoId: id,
      fieldsUpdated: Object.keys(validatedData),
      operation: 'updateContent'
    });
  } catch (error) {
    this.appContext.logger.error('Todo content update failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      todoId: id,
      operation: 'updateContent'
    });
    throw error;
  }
}
```

### UUID Validation Patterns

```typescript
// Centralized UUID parsing with validation
private parseUUID(id: string): string {
  if (!z.string().uuid().safeParse(id).success) {
    throw new Err.ValidationError(`Invalid UUID format: ${id}. Expected valid UUID string.`, {
      uuid: id,
      expectedFormat: 'valid UUID string'
    });
  }
  return id;
}

// Zod utilities for UUID validation
import { commonValidation } from '~/lib/validation/zod-utils';

const schema = z.object({
  userId: commonValidation.uuid,     // string UUID validation
  todoId: commonValidation.uuid,     // string UUID validation
});
```

## Implementation Patterns

### Repository Interface Structure

```typescript
export interface ITodoRepository {
  // =============================================================================
  // BASIC CRUD OPERATIONS
  // =============================================================================
  create(input: TodoCreateData): Promise<Todo>;
  findById(id: string): Promise<Todo | null>;
  findByUserId(userId: string, options?: TodoQueryOptions): Promise<Todo[]>;
  delete(id: string): Promise<void>;

  // =============================================================================
  // DEDICATED UPDATE METHODS (No generic update!)
  // =============================================================================
  updateContent(id: string, input: TodoContentPartialUpdate): Promise<void>;
  updateStatus(id: string, input: TodoStatusUpdate): Promise<void>;
  updateTitle(id: string, input: TodoTitleUpdate): Promise<void>;
  
  // =============================================================================
  // SPECIALIZED OPERATIONS
  // =============================================================================
  toggleCompletion(id: string): Promise<Todo>;
  countByUserId(userId: string, filter?: { completed?: boolean }): Promise<number>;
  
  // =============================================================================
  // QUERY OPERATIONS
  // =============================================================================
  findByStatus(userId: string, completed: boolean): Promise<Todo[]>;
}
```

### Repository Implementation Structure

```typescript
export class DrizzleTodoRepository extends BaseDrizzleRepository implements ITodoRepository {
  constructor(private appContext: AppContext) {
    super('Todo');
  }

  protected getLogger() {
    return this.appContext.logger;
  }

  // Centralized UUID parsing
  private parseUUID(id: string): string { /* ... */ }

  // Domain conversion helpers
  private mapToDomainModel(entity: DbTodoEntity): Todo { /* ... */ }

  // Repository methods with validation
  async updateContent(id: string, input: TodoContentPartialUpdate): Promise<void> {
    const validatedData = RepoTodoContentUpdateSchema.parse(input);
    const db = await this.getDatabase();
    
    await db.update(todos)
      .set(validatedData)
      .where(eq(todos.id, id));
  }
}
```

### Naming Conventions

| Pattern | Example | Purpose |
|---------|---------|---------|
| `EntityCreateData` | `TodoCreateData` | Data required for entity creation |
| `EntityFieldUpdate` | `TodoStatusUpdate` | Update specific field(s) |
| `EntityFieldPartialUpdate` | `TodoContentPartialUpdate` | Optional field updates |
| `RepoEntityOperationSchema` | `RepoTodoContentSchema` | Validation schema |

## Service Integration

### Service Layer Database Independence ⭐

**CRITICAL ARCHITECTURAL PRINCIPLE**: The service layer is completely database-agnostic and NEVER contains database-specific syntax or types.

#### Service Layer Implementation - Database Independent ✅

```typescript
export class TodoService implements ITodoService {
  constructor(
    private appContext: AppContext,
    private todoRepository: ITodoRepository
  ) {}

  async updateTodo(todoId: string, todoData: UpdateTodoRequest, userId: string): Promise<void> {
    // 1. Permission checking (service responsibility)
    // 2. Business logic validation (service responsibility)
    const existingTodo = await this.todoRepository.findById(todoId);
    if (!existingTodo) {
      throw new Err.NotFoundError('Todo not found');
    }

    if (existingTodo.userId !== userId) {
      throw new Err.ForbiddenError('Access denied');
    }

    // 3. Pass domain types (strings) to repository - NO database conversion ✅
    if (todoData.title !== undefined || todoData.description !== undefined) {
      await this.todoRepository.updateContent(todoId, {
        title: todoData.title,
        description: todoData.description
      });
    }
    
    if (todoData.completed !== undefined) {
      await this.todoRepository.updateStatus(todoId, {
        completed: todoData.completed
      });
    }

    this.appContext.logger.info('Todo updated successfully', {
      todoId,
      operation: 'updateTodo'
    });
  }

  async createTodo(data: CreateTodoRequest, userId: string): Promise<Todo> {
    // Service builds domain objects (NO database syntax) ✅
    const todoData: TodoCreateData = {
      title: data.title,
      description: data.description,
      completed: false,
      userId: userId,           // String - repository handles validation
    };

    // Pass domain object to repository ✅
    const todo = await this.todoRepository.create(todoData);
    
    this.appContext.logger.info('Todo created successfully', {
      todoId: todo.id,
      userId,
      operation: 'createTodo'
    });

    return todo;
  }
}
```

## Best Practices

### ✅ Do's

1. **Always derive types from database schemas**
   ```typescript
   export type TodoCreateData = Omit<DbTodoEntity, 'id' | 'createdAt' | 'updatedAt'>;
   ```

2. **Use dedicated methods for each operation**
   ```typescript
   updateContent(id: string, input: TodoContentPartialUpdate): Promise<void>;
   updateStatus(id: string, input: TodoStatusUpdate): Promise<void>;
   ```

3. **Validate at repository boundary**
   ```typescript
   const validatedData = RepoTodoContentSchema.parse(input);
   ```

4. **Keep service layer database-agnostic** ⭐
   ```typescript
   // ✅ Service builds domain objects (strings only)
   const todoUpdate = { title: title, completed: false }; // No database types!
   await this.todoRepository.updateContent(todoId, todoUpdate);
   ```

### ❌ Don'ts

1. **Never use generic update methods**
   ```typescript
   // ❌ FORBIDDEN
   update(id: string, data: unknown): Promise<void>;
   ```

2. **Never put database syntax in service layer** ⭐
   ```typescript
   // ❌ FORBIDDEN in service
   await db.update(todos).set({ title }).where(eq(todos.id, id));
   ```

3. **Never import database types in service layer** ⭐
   ```typescript
   // ❌ FORBIDDEN in service
   import { DbTodoEntity } from '~/infrastructure/db/schema';
   ```

4. **Never create manual type definitions**
   ```typescript
   // ❌ FORBIDDEN
   interface TodoUpdate {
     title?: string;  // Could drift from DbTodo
   }
   ```

## Migration Guide

### From MongoDB to PostgreSQL/Drizzle

1. **Define Database Schema**:
```typescript
// Before: MongoDB entity with ObjectId
interface DbTodoEntity extends AuditableDocument {
  _id: ObjectId;
  title: string;
  userId: ObjectId;
}

// After: Drizzle schema with UUID
export const todos = pgTable('todo', {
  ...baseFields,  // id (UUID), createdAt, updatedAt
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  completed: boolean('completed').notNull().default(false),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});
```

2. **Create Derived Types**:
```typescript
// Derive all repository types from schema
type DbTodoEntity = typeof todos.$inferSelect;
type TodoCreateData = Omit<DbTodoEntity, 'id' | 'createdAt' | 'updatedAt'>;
```

3. **Replace Generic Methods**:
```typescript
// Before: Generic methods
update(id: string, data: Partial<Todo>): Promise<void>

// After: Dedicated methods
updateContent(id: string, input: TodoContentUpdate): Promise<void>
updateStatus(id: string, input: TodoStatusUpdate): Promise<void>
```

4. **Add Validation**:
```typescript
// Add Zod schemas with matches<T>() utility
export const RepoTodoCreateSchema = matches<TodoCreateData>()(
  z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).nullable().optional(),
    completed: z.boolean().default(false),
    userId: z.string().uuid(),
  })
);
```

## Conclusion

This Schema-Based Repository Architecture with PostgreSQL and Drizzle ORM provides:

- **🔒 Type Safety**: Compile-time and runtime type checking
- **📋 Clear Interfaces**: Explicit methods for each operation  
- **🔄 Maintainability**: Types automatically update with schema changes
- **🚫 Error Prevention**: Validation catches issues before database operations
- **📖 Self-Documentation**: Code clearly expresses intent and capabilities
- **🏗️ Scalability**: Pattern scales to complex domains without breaking
- **⭐ Database Independence**: Service layer works with any database technology
- **🧪 Enhanced Testability**: Services can be tested without database-specific dependencies
- **🎯 Separation of Concerns**: Clear boundaries between business logic and data access
- **⚡ Performance**: Native PostgreSQL performance with connection pooling
- **🛠️ Modern Tooling**: Drizzle Studio, type-safe migrations, and SQL ecosystem

The architecture eliminates common repository anti-patterns while providing the foundation for robust, maintainable, and database-agnostic data access layers with modern SQL capabilities.