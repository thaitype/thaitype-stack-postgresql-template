# Design Patterns & Development Guidelines

This document provides comprehensive guidelines for the design patterns, architectural decisions, and development practices used in this Todo App Template. These patterns ensure type safety, maintainability, and scalability across the entire application using PostgreSQL with Drizzle ORM.

## Table of Contents

1. [Schema-Based Repository Pattern](#schema-based-repository-pattern)
2. [Service Layer Patterns](#service-layer-patterns)
3. [Validation Architecture](#validation-architecture)
4. [tRPC Integration Patterns](#trpc-integration-patterns)
5. [UI Component Patterns](#ui-component-patterns)
6. [Authentication Patterns](#authentication-patterns)
7. [Best Practices](#best-practices)
8. [Anti-Patterns & Common Mistakes](#anti-patterns--common-mistakes)

---

## Schema-Based Repository Pattern

### Core Philosophy

The **Schema-Based Repository Pattern** establishes database schemas as the single source of truth for all type definitions using PostgreSQL and Drizzle ORM. This prevents type drift and ensures consistency across the application layers.

### 1. Database Schema Definition

Database schemas are defined using Drizzle's `pgTable` in `~/server/infrastructure/db/schema/` and serve as the foundation for all derived types:

```typescript
// ~/server/infrastructure/db/schema/todo.ts
import { boolean, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { baseFields, type BaseFields } from './base';
import { user } from './user';

export const todos = pgTable('todo', {
  ...baseFields,  // id (UUID), createdAt, updatedAt
  
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  completed: boolean('completed').notNull().default(false),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

// Relations for type-safe joins
export const todosRelations = relations(todos, ({ one }) => ({
  user: one(user, {
    fields: [todos.userId],
    references: [user.id],
  }),
}));

// Inferred types from schema
export type DbTodoEntity = typeof todos.$inferSelect;
export type DbTodoInsert = typeof todos.$inferInsert;
export type DbTodoUpdate = Partial<Omit<DbTodoEntity, 'id' | 'createdAt' | 'userId'>>;
```

### 2. Domain Model Definition

Domain models in `~/server/domain/models/` represent the business layer view with string-based IDs:

```typescript
// ~/server/domain/models/todo.ts
export interface Todo {
  id: string;              // String representation of UUID
  title: string;
  description?: string | null;
  completed: boolean;
  userId: string;          // String representation of UUID
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. Repository Type Derivation

All repository types **MUST** derive from database schemas using TypeScript utility types:

```typescript
// ~/server/domain/repositories/types/todo-repository-types.ts
import type { DbTodoEntity } from '~/server/infrastructure/db/schema/todo';

// ✅ CORRECT: Derive from database schema
export type TodoCreateData = Omit<DbTodoEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type TodoContentUpdate = Pick<DbTodoEntity, 'title' | 'description'>;
export type TodoContentPartialUpdate = Partial<TodoContentUpdate>;
export type TodoStatusUpdate = Pick<DbTodoEntity, 'completed'>;

// ❌ FORBIDDEN: Manual type definitions
interface TodoCreateData {
  title: string;        // Could drift from DbTodoEntity
  description: string;  // Could become out of sync
}
```

### 4. Repository Interface Design

Repository interfaces define domain-focused methods with explicit naming:

```typescript
// ~/server/domain/repositories/todo-repository.ts
export interface ITodoRepository {
  // Explicit, dedicated methods instead of generic CRUD
  create(input: TodoCreateData): Promise<Todo>;
  findById(id: string): Promise<Todo | null>;
  findByUserId(userId: string, options?: TodoQueryOptions): Promise<Todo[]>;
  
  // Dedicated update methods for different concerns
  updateContent(id: string, input: TodoContentPartialUpdate): Promise<void>;
  updateStatus(id: string, input: TodoStatusUpdate): Promise<void>;
  
  // Specialized operations
  toggleCompletion(id: string): Promise<Todo>;
  delete(id: string): Promise<void>;
  countByUserId(userId: string, filter?: { completed?: boolean }): Promise<number>;
}
```

### 5. Repository Implementation

Repository implementations handle UUID validation and conversion:

```typescript
// ~/server/infrastructure/repositories/drizzle-todo-repository.ts
export class DrizzleTodoRepository extends BaseDrizzleRepository implements ITodoRepository {
  protected entityName = 'Todo';

  async create(input: TodoCreateData): Promise<Todo> {
    try {
      // Validate input with Zod schema
      const validatedInput = RepoTodoCreateSchema.parse(input);
      
      // Create record with Drizzle
      const db = await this.getDatabase();
      const [created] = await db.insert(todos).values(validatedInput).returning();
      
      if (!created) {
        throw new DatabaseError('Failed to create todo');
      }

      // Convert to domain model
      return this.mapToDomainModel(created);
    } catch (error) {
      this.getLogger().error('Failed to create todo', { error, input });
      throw error;
    }
  }

  private mapToDomainModel(entity: DbTodoEntity): Todo {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      completed: entity.completed,
      userId: entity.userId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
```

---

## Service Layer Patterns

### Database-Agnostic Business Logic

Service layer contains business logic and **NEVER** imports database-specific types directly:

```typescript
// ~/server/services/todo-service.ts
import type { AppContext } from '~/server/context/app-context';
import type { ITodoRepository, Todo } from '~/server/domain';
import * as Err from '~/server/lib/errors';

export class TodoService {
  constructor(
    private appContext: AppContext,
    private todoRepository: ITodoRepository
  ) {}

  async createTodo(userId: string, request: CreateTodoRequest): Promise<Todo> {
    try {
      // Business validation
      if (!request.title.trim()) {
        throw new Err.ValidationError('Title is required');
      }

      if (request.title.length > 200) {
        throw new Err.ValidationError('Title too long', {
          maxLength: 200,
          currentLength: request.title.length
        });
      }

      // Delegate to repository with domain types (strings)
      const todo = await this.todoRepository.create({
        title: request.title.trim(),
        description: request.description?.trim() ?? null,
        completed: false,
        userId
      });

      this.appContext.logger.info('Todo created successfully', {
        todoId: todo.id,
        userId,
        service: 'TodoService',
        operation: 'createTodo'
      });

      return todo;
    } catch (error) {
      this.appContext.logger.error('Failed to create todo', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        request,
        service: 'TodoService',
        operation: 'createTodo'
      });
      throw error;
    }
  }

  async updateTodo(todoId: string, request: UpdateTodoRequest, userId: string): Promise<void> {
    // Permission checking (service responsibility)
    const existingTodo = await this.todoRepository.findById(todoId);
    if (!existingTodo) {
      throw new Err.NotFoundError('Todo not found');
    }

    if (existingTodo.userId !== userId) {
      throw new Err.ForbiddenError('Access denied to this todo');
    }

    // Handle different update operations
    if (request.title !== undefined || request.description !== undefined) {
      await this.todoRepository.updateContent(todoId, {
        title: request.title,
        description: request.description
      });
    }

    if (request.completed !== undefined) {
      await this.todoRepository.updateStatus(todoId, {
        completed: request.completed
      });
    }

    this.appContext.logger.info('Todo updated successfully', {
      todoId,
      userId,
      service: 'TodoService',
      operation: 'updateTodo'
    });
  }
}
```

---

## Validation Architecture

### Zod Schema with Type Alignment

Use the `matches<T>()` utility to ensure Zod schemas align with TypeScript types:

```typescript
// ~/server/domain/repositories/schemas/todo-repository-schemas.ts
import { matches } from '~/server/lib/validation/zod-utils';
import { z } from 'zod';
import { commonValidation } from '~/server/lib/validation';

// Type definitions derived from schema
export type TodoCreateData = Omit<DbTodoEntity, 'id' | 'createdAt' | 'updatedAt'>;

// Schema that matches the type exactly
export const RepoTodoCreateSchema = matches<TodoCreateData>()(
  z.object({
    title: commonValidation.nonEmptyString.max(200),
    description: z.string().max(1000).nullable().optional(),
    completed: z.boolean().default(false),
    userId: z.string().uuid(),
  })
);

// Compile-time type checking ensures schema matches type
const _typeCheck: TodoCreateData = {} as z.infer<typeof RepoTodoCreateSchema>;
```

### Common Validation Utilities

```typescript
// ~/server/lib/validation/common.ts
import { z } from 'zod';

export const commonValidation = {
  nonEmptyString: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email format'),
  uuid: z.string().uuid('Invalid UUID format'),
};
```

---

## tRPC Integration Patterns

### Router Structure

Organize tRPC routers by feature with consistent error handling:

```typescript
// ~/server/api/routers/todo.ts
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { TRPCError } from '@trpc/server';
import * as Err from '~/server/lib/errors';

export const todoRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const todo = await ctx.todoService.createTodo(userId, input);
        
        return {
          success: true,
          todo
        };
      } catch (error) {
        ctx.logger.error('Failed to create todo', { error, input });
        
        if (error instanceof Err.ValidationError) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
            cause: error
          });
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create todo'
        });
      }
    }),

  getAll: protectedProcedure
    .input(z.object({
      includeCompleted: z.boolean().default(true),
      limit: z.number().min(1).max(100).optional(),
      skip: z.number().min(0).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const todos = await ctx.todoService.getTodos(userId, input);
      
      return {
        todos,
        total: todos.length
      };
    }),
});
```

### Client-Side Integration

Use tRPC hooks with proper error handling and optimistic updates:

```typescript
// ~/app/_components/TodoList.tsx
import { api } from '~/trpc/react';
import { notifications } from '@mantine/notifications';

export function TodoList() {
  const utils = api.useUtils();
  
  const { 
    data: todosData, 
    isLoading, 
    error 
  } = api.todo.getAll.useQuery({
    includeCompleted: true,
  });

  const createMutation = api.todo.create.useMutation({
    onSuccess: () => {
      // Invalidate queries for real-time updates
      void utils.todo.getAll.invalidate();
      void utils.todo.getStats.invalidate();
      
      notifications.show({
        title: 'Success',
        message: 'Todo created successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const handleCreate = (input: CreateTodoInput) => {
    createMutation.mutate(input);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {todosData?.todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} onUpdate={handleCreate} />
      ))}
    </div>
  );
}
```

---

## UI Component Patterns

### Mantine Component Composition

Build responsive components with Mantine's design system:

```typescript
// ~/app/_components/TodoItem.tsx
import {
  Card,
  Text,
  Checkbox,
  Group,
  ActionIcon,
  Menu,
  Stack,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconDots, IconEdit, IconTrash } from '@tabler/icons-react';
import { api } from '~/trpc/react';

interface TodoItemProps {
  todo: Todo;
  onUpdate?: () => void;
}

export function TodoItem({ todo, onUpdate }: TodoItemProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const utils = api.useUtils();

  const toggleMutation = api.todo.toggle.useMutation({
    onSuccess: () => {
      void utils.todo.getAll.invalidate();
      void utils.todo.getStats.invalidate();
      onUpdate?.();
    },
  });

  const deleteMutation = api.todo.delete.useMutation({
    onSuccess: () => {
      void utils.todo.getAll.invalidate();
      void utils.todo.getStats.invalidate();
      onUpdate?.();
    },
  });

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" style={{ flex: 1 }}>
          <Checkbox
            checked={todo.completed}
            onChange={() => toggleMutation.mutate({ id: todo.id })}
          />
          <Stack gap={2} style={{ flex: 1 }}>
            <Text
              fw={500}
              td={todo.completed ? 'line-through' : undefined}
              c={todo.completed ? 'dimmed' : undefined}
            >
              {todo.title}
            </Text>
            {todo.description && (
              <Text size="sm" c="dimmed">
                {todo.description}
              </Text>
            )}
          </Stack>
        </Group>

        {!isMobile && (
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDots size="1rem" />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconEdit size="0.9rem" />}>
                Edit
              </Menu.Item>
              <Menu.Item 
                leftSection={<IconTrash size="0.9rem" />}
                color="red"
                onClick={() => deleteMutation.mutate({ id: todo.id })}
              >
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
    </Card>
  );
}
```

### Form Validation Patterns

```typescript
// ~/app/_components/AddTodoForm.tsx
import { useForm } from '@mantine/form';
import { TextInput, Textarea, Button } from '@mantine/core';
import { z } from 'zod';

const todoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
});

export function AddTodoForm() {
  const form = useForm({
    initialValues: {
      title: '',
      description: '',
    },
    validate: {
      title: (value) => {
        try {
          todoSchema.pick({ title: true }).parse({ title: value });
          return null;
        } catch (error) {
          return error.errors[0]?.message ?? 'Invalid title';
        }
      },
    },
  });

  const createMutation = api.todo.create.useMutation({
    onSuccess: () => {
      form.reset();
      notifications.show({
        title: 'Success',
        message: 'Todo created successfully',
        color: 'green',
      });
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    createMutation.mutate(values);
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <TextInput
        label="Title"
        placeholder="What needs to be done?"
        required
        {...form.getInputProps('title')}
      />
      <Textarea
        label="Description"
        placeholder="Additional details..."
        {...form.getInputProps('description')}
      />
      <Button type="submit" loading={createMutation.isPending}>
        Add Todo
      </Button>
    </form>
  );
}
```

---

## Authentication Patterns

### Session Management

```typescript
// ~/lib/auth-client.ts - Client-side auth
import { useQuery } from '@tanstack/react-query';
import { authClient } from './auth-client-setup';

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: () => authClient.getSession(),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export const { signIn, signOut, signUp } = authClient;
```

### Protected Route Pattern

```typescript
// ~/server/api/trpc.ts
import { TRPCError } from '@trpc/server';

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});
```

---

## Best Practices

### 1. Naming Conventions

```typescript
// Interfaces
interface ITodoRepository { }        // Repository interfaces with 'I' prefix
interface Todo { }                   // Domain models
interface DbTodoEntity { }           // Database entity types

// Types
type TodoCreateData = ...;           // Repository types
type CreateTodoRequest = ...;        // Service layer request types
type TodoQueryOptions = ...;         // Query option types

// Classes
class TodoService { }                // Services with 'Service' suffix
class DrizzleTodoRepository { }      // Repository implementations

// Functions
function createDatabaseConnection()  // Factory functions with 'create' prefix
function mapToDomainModel()          // Mapper functions with 'mapTo' prefix
```

### 2. Import Organization

```typescript
// 1. Node modules
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// 2. Internal types and interfaces
import type { AppContext } from '~/server/context/app-context';
import type { ITodoRepository, Todo } from '~/server/domain';

// 3. Internal utilities and constants
import * as Err from '~/server/lib/errors';
import { commonValidation } from '~/server/lib/validation';

// 4. Implementation imports
import { DrizzleTodoRepository } from '~/server/infrastructure/repositories';
```

### 3. Error Handling Patterns

```typescript
// Domain-specific errors
export class ValidationError extends Error {
  constructor(message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// Service layer error handling
try {
  const result = await this.repository.operation();
  return result;
} catch (error) {
  this.logger.error('Operation failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
    context: { userId, operationType: 'create' }
  });
  throw error; // Re-throw to maintain error type
}
```

### 4. Logging Patterns

```typescript
// Structured logging with context
this.logger.info('Todo created successfully', {
  todoId: todo.id,
  userId,
  operation: 'createTodo',
  service: 'TodoService'
});

this.logger.error('Failed to create todo', {
  error: error instanceof Error ? error.message : 'Unknown error',
  userId,
  title: request.title,
  operation: 'createTodo',
  service: 'TodoService'
});
```

---

## Anti-Patterns & Common Mistakes

### ❌ 1. Manual Type Definitions

```typescript
// ❌ DON'T: Define types manually
interface TodoCreateData {
  title: string;
  description: string; // Could become out of sync with schema
}

// ✅ DO: Derive from database schema
type TodoCreateData = Omit<DbTodoEntity, 'id' | 'createdAt' | 'updatedAt'>;
```

### ❌ 2. Generic Repository Methods

```typescript
// ❌ DON'T: Use generic update methods
interface ITodoRepository {
  update(id: string, data: Partial<Todo>): Promise<void>;
}

// ✅ DO: Use dedicated, explicit methods
interface ITodoRepository {
  updateContent(id: string, input: TodoContentUpdate): Promise<void>;
  updateStatus(id: string, input: TodoStatusUpdate): Promise<void>;
}
```

### ❌ 3. Database Types in Service Layer

```typescript
// ❌ DON'T: Import database types in services
import { DbTodoEntity } from '~/infrastructure/db/schema';

export class TodoService {
  async findById(entity: DbTodoEntity): Promise<Todo> { } // Wrong!
}

// ✅ DO: Use domain types in service layer
export class TodoService {
  async findById(id: string): Promise<Todo> { } // Correct!
}
```

### ❌ 4. Unvalidated Repository Inputs

```typescript
// ❌ DON'T: Skip validation in repository
async create(input: unknown): Promise<Todo> {
  const db = await this.getDatabase();
  return db.insert(todos).values(input); // Dangerous!
}

// ✅ DO: Validate with Zod schemas
async create(input: TodoCreateData): Promise<Todo> {
  const validatedInput = RepoTodoCreateSchema.parse(input);
  const db = await this.getDatabase();
  return db.insert(todos).values(validatedInput);
}
```

### ❌ 5. Direct Database Operations in Services

```typescript
// ❌ DON'T: Direct database operations in services
export class TodoService {
  async createTodo(userId: string, input: CreateTodoRequest): Promise<Todo> {
    const db = await getDatabase();
    const result = await db.insert(todos).values(input); // Wrong layer!
    return result;
  }
}

// ✅ DO: Use repository abstraction
export class TodoService {
  async createTodo(userId: string, input: CreateTodoRequest): Promise<Todo> {
    return this.todoRepository.create(input); // Correct!
  }
}
```

---

This design pattern documentation ensures consistency, type safety, and maintainability across the entire application using PostgreSQL with Drizzle ORM. Following these patterns will result in a robust, scalable codebase that's easy to understand and extend.