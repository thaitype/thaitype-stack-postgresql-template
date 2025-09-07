# Todo App Template - Next.js Enterprise Stack

> This project is using upstream from [thaitype-stack-mongodb-template](https://github.com/thaitype/thaitype-stack-mongodb-template), however, this will be a sql-based template with drizzleorm

A production-ready **Todo Application Template** built with Next.js 15, implementing enterprise-grade patterns and modern development practices. This template serves as a robust foundation for building scalable full-stack applications with authentication, CRUD operations, and real-time updates.

## ✨ Features

- 🔐 **Authentication System** - Better Auth with email/password
- 📝 **Todo Management** - Full CRUD operations with real-time updates  
- 🎨 **Modern UI** - Mantine components with responsive design
- 🏗️ **Enterprise Architecture** - Entity-based repository pattern
- 🔒 **Type Safety** - Full TypeScript with tRPC API layer
- 📊 **Database** - PostgreSQL with Drizzle ORM
- ⚡ **Performance** - Next.js 15 with App Router and React 19
- 🎯 **Production Ready** - ESLint, Prettier, structured logging

## 🚀 Tech Stack

### Core Framework
- **[Next.js 15](https://nextjs.org)** - React framework with App Router
- **[React 19](https://react.dev)** - Latest React with concurrent features
- **[TypeScript](https://typescriptlang.org)** - Strict type safety

### Backend & API
- **[tRPC](https://trpc.io)** - End-to-end typesafe APIs
- **[PostgreSQL](https://postgresql.org)** - Relational database
- **[Drizzle ORM](https://orm.drizzle.team)** - TypeScript ORM with SQL-like syntax
- **[Better Auth](https://www.better-auth.com)** - Modern authentication library
- **[Zod](https://zod.dev)** - TypeScript-first schema validation

### Frontend & UI
- **[Mantine](https://mantine.dev)** - React components library
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[@tabler/icons-react](https://tabler-icons.io)** - Icon library

### Development Tools
- **[ESLint](https://eslint.org)** - Code linting
- **[Prettier](https://prettier.io)** - Code formatting  
- **[Pino](https://getpino.io)** - Structured logging

## 🏗️ Architecture

This template implements an **Entity-Based Repository Architecture** with strict separation of concerns:

```
src/
├── app/                    # Next.js App Router
│   ├── _components/        # UI components
│   ├── api/trpc/          # tRPC API routes  
│   └── (auth pages)       # Login, register, profile
├── server/
│   ├── api/               # tRPC routers and procedures
│   ├── domain/            # Business domain layer
│   │   ├── models/        # Domain interfaces (string IDs)
│   │   └── repositories/  # Repository interfaces
│   ├── infrastructure/    # Data access layer
│   │   ├── entities/      # Database entities (ObjectIds)
│   │   └── repositories/  # Repository implementations
│   ├── services/          # Business logic (database-agnostic)
│   └── lib/               # Shared utilities
└── trpc/                  # Client-side tRPC setup
```

### Key Patterns
- **Entity-First Design**: All types derive from database entities
- **Domain-Driven Services**: Business logic with string-based IDs  
- **Type-Safe Validation**: Zod schemas with `matches<T>()` utility
- **Native Features**: Drizzle's built-in UUID and timestamp management
- **Structured Logging**: Request tracing and error context

## 🚦 Quick Start

### Prerequisites
- **Node.js 18+** 
- **pnpm** (recommended) or npm
- **PostgreSQL** instance (local or cloud)

### 1. Clone and Install
```bash
git clone <repository-url> my-todo-app
cd my-todo-app
pnpm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Configure your `.env` file:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/todoapp"

# Authentication
BETTER_AUTH_SECRET="your-secret-key-here"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000/api/auth"

# App Configuration  
NODE_ENV="development"
PORT="3000"
```

### 3. Database Setup
```bash
# Generate migration files from schema
pnpm db:generate

# Apply migrations to create database tables
pnpm db:migrate

# Seed the database with sample data (optional)
pnpm db:seed
```

### 4. Start Development
```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app!

## 🗄️ Database Setup Guide

### Understanding Database Commands

This template uses **Drizzle ORM** with **PostgreSQL**. Here's the recommended workflow:

#### 1. Migration-Based Workflow (Recommended for Production)
```bash
# 1. Generate migration files from your schema changes
pnpm db:generate

# 2. Review generated migrations in ./drizzle/ directory
# 3. Apply migrations to database
pnpm db:migrate

# 4. Seed with sample data (optional)
pnpm db:seed
```

#### 2. Push Workflow (Development Only)
```bash
# Push schema directly to database (bypasses migrations)
pnpm db:push

# Seed with sample data (optional)  
pnpm db:seed
```

### First Time Setup

1. **Create PostgreSQL Database**
   ```bash
   # Using psql (if PostgreSQL is installed locally)
   createdb todoapp
   
   # Or connect to your cloud database provider
   # Update DATABASE_URL in .env with your connection string
   ```

2. **Set Up Schema**
   ```bash
   # Generate initial migration files
   pnpm db:generate
   
   # Apply migrations to create tables
   pnpm db:migrate
   ```

3. **Add Sample Data**
   ```bash
   # Populate database with test data
   pnpm db:seed
   ```

### Sample Data Overview

Running `pnpm db:seed` creates:

- **2 Roles**: `admin`, `user`  
- **2 Users**: 
  - `john@example.com` (User role)
  - `admin@example.com` (Admin + User roles)
- **5 Sample Todos**: Mix of completed and pending tasks
- **Role Assignments**: Users connected to roles via junction table

### Database Management

#### View Database
```bash
# Open Drizzle Studio - visual database browser
pnpm db:studio
# Opens at http://localhost:4983
```

#### Reset Database (Development)
```bash
# WARNING: This destroys all data
pnpm db:drop

# Recreate schema
pnpm db:migrate

# Add sample data
pnpm db:seed
```

#### Migration vs Push

| Command | Use Case | Description |
|---------|----------|-------------|
| `db:migrate` | **Production** | Applies versioned migrations, maintains history |
| `db:push` | **Development** | Direct schema sync, no migration files |

### Troubleshooting

#### "relation does not exist" Error
```bash
# This means tables haven't been created yet
# Solution: Run migrations first
pnpm db:migrate
pnpm db:seed
```

#### Database Connection Errors
1. Check your `DATABASE_URL` in `.env`
2. Ensure PostgreSQL is running
3. Verify database exists and credentials are correct

#### Migration Conflicts
```bash
# Reset and start fresh (loses all data)
pnpm db:drop
pnpm db:generate  
pnpm db:migrate
pnpm db:seed
```

#### Environment Variables Not Loaded
The seed script automatically loads `.env` file. Ensure your `.env` contains:
```env
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
```

## 📋 Development Commands

```bash
# Development
pnpm dev              # Start development server with Turbo
pnpm build            # Build for production
pnpm start            # Start production server
pnpm preview          # Build and start production server

# Database
pnpm db:generate      # Generate migration files from schema
pnpm db:migrate       # Apply migrations to create/update tables
pnpm db:push          # Push schema directly (development only)
pnpm db:studio        # Open Drizzle Studio (database GUI)
pnpm db:seed          # Seed database with sample data
pnpm db:drop          # Drop all database tables (destructive)

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint errors
pnpm typecheck        # Run TypeScript check
pnpm check            # Run lint + typecheck together

# Formatting
pnpm format:check     # Check Prettier formatting
pnpm format:write     # Apply Prettier formatting
```

## 🏛️ Design Patterns

This template follows enterprise-grade design patterns documented in [`docs/repo-architecture.md`](docs/repo-architecture.md).

### Core Principles

1. **Single Source of Truth** - Types derive from database entities
2. **Dedicated Methods** - Explicit operations over generic CRUD
3. **Repository Validation** - Single validation point at data boundary
4. **Service Abstraction** - Database-agnostic business logic

### Example: Todo Repository Pattern

```typescript
// Domain Model (strings)
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  userId: string;
}

// Database Entity (UUIDs)  
interface DbTodoEntity {
  id: string;
  title: string;
  completed: boolean;
  userId: string;
}

// Repository Interface (domain types)
interface ITodoRepository {
  create(input: TodoCreateData, context: RepositoryContext): Promise<Todo>;
  updateContent(id: string, input: TodoContentUpdate, userId: string): Promise<void>;
  updateStatus(id: string, input: TodoStatusUpdate, userId: string): Promise<void>;
}

// Service Layer (business logic)
class TodoService {
  async createTodo(userId: string, request: CreateTodoRequest): Promise<Todo> {
    // Business validation and logic
    const context = createRepositoryContext(userId);
    return this.todoRepository.create(request, context);
  }
}
```

## 🔐 Authentication

Built-in authentication system with **Better Auth**:

- **Email/Password** authentication
- **Session Management** with secure cookies
- **Protected Routes** with middleware
- **User Context** propagation throughout the app

### Usage Example
```typescript
// Client-side
import { useSession, signIn, signOut } from '~/lib/auth-client';

function MyComponent() {
  const { data: session, isPending } = useSession();
  
  if (session?.user) {
    return <div>Hello, {session.user.name}!</div>;
  }
  
  return <button onClick={() => signIn.email(credentials)}>Sign In</button>;
}
```

## 📊 Database Schema

### Users Table
```typescript
interface DbUserEntity {
  id: string;          // UUID primary key (auto-generated)
  email: string;       // Unique email address
  name: string;        // User display name
  bio?: string;        // Optional user biography
  avatar?: string;     // Optional avatar URL
  website?: string;    // Optional website URL
  // Auto-managed timestamps
  createdAt: Date;     // Auto-set on creation
  updatedAt: Date;     // Auto-updated on changes
}
```

### Roles Table
```typescript
interface DbRoleEntity {
  id: string;          // UUID primary key (auto-generated)
  name: string;        // Unique role name (e.g., 'admin', 'user')
  description?: string; // Optional role description
  // Auto-managed timestamps
  createdAt: Date;     // Auto-set on creation
  updatedAt: Date;     // Auto-updated on changes
}
```

### User Roles Junction Table
```typescript
interface DbUserRoleEntity {
  id: string;          // UUID primary key (auto-generated)
  userId: string;      // Foreign key to users.id
  roleId: string;      // Foreign key to roles.id
  // Auto-managed timestamps
  createdAt: Date;     // Auto-set on creation
  updatedAt: Date;     // Auto-updated on changes
  // Unique constraint on (userId, roleId)
}
```

### Todos Table
```typescript  
interface DbTodoEntity {
  id: string;          // UUID primary key (auto-generated)
  title: string;       // Todo title
  description?: string; // Optional todo description
  completed: boolean;  // Completion status
  userId: string;      // Foreign key to users.id
  // Auto-managed timestamps
  createdAt: Date;     // Auto-set on creation
  updatedAt: Date;     // Auto-updated on changes
}
```

### Domain Models (Service Layer)

The service layer works with normalized domain models:

```typescript
interface User {
  id: string;          // String representation of UUID
  email: string;
  name: string;
  roles: string[];     // Array of role names (e.g., ['admin', 'user'])
  bio?: string;
  avatar?: string;
  website?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Database Features

- **UUID Primary Keys**: All tables use UUID for primary keys
- **Automatic Timestamps**: `createdAt` and `updatedAt` managed automatically
- **Normalized Roles**: Many-to-many relationship between users and roles
- **Foreign Key Constraints**: Referential integrity enforced
- **Unique Constraints**: Email uniqueness, role name uniqueness, user-role pairs

## 🚀 Deployment

### Production Build
```bash
pnpm build
```

### Environment Variables
Set these in your production environment:
```env
NODE_ENV="production"
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
BETTER_AUTH_SECRET="secure-production-secret"
NEXT_PUBLIC_BETTER_AUTH_URL="https://yourdomain.com/api/auth"
```

### Hosting Options

#### Vercel (Recommended)
```bash
pnpm dlx vercel
```

#### Railway
```bash
pnpm dlx @railway/cli deploy
```

#### Docker
```bash
docker build -t todo-app .
docker run -p 3000:3000 todo-app
```

## 🛠️ Customization

### Adding New Features

1. **Define Domain Model** in `~/server/domain/models/`
2. **Create Database Entity** in `~/server/infrastructure/entities/`
3. **Build Repository Interface** in `~/server/domain/repositories/`
4. **Implement Repository** in `~/server/infrastructure/repositories/`
5. **Create Service Layer** in `~/server/services/`
6. **Add tRPC Router** in `~/server/api/routers/`
7. **Build UI Components** in `~/app/_components/`

### Template Structure
```
├── Authentication System ✅
├── Todo CRUD Operations ✅  
├── Real-time Updates ✅
├── Responsive UI ✅
├── Production Logging ✅
├── Type Safety ✅
```

## 📚 Documentation

- **[Entity Architecture Guide](docs/repo-architecture.md)** - Repository pattern details
- **[CLAUDE.md](CLAUDE.md)** - AI development guidelines
- **[API Documentation](#)** - tRPC endpoint reference (generated)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following the established patterns
4. Run quality checks: `pnpm check`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [T3 Stack](https://create.t3.gg/) foundation
- UI components by [Mantine](https://mantine.dev)
- Database ORM by [Drizzle](https://orm.drizzle.team)
- Authentication by [Better Auth](https://www.better-auth.com)

---

**Made with ❤️ for modern web development**

*This template represents production-ready patterns and can be used as a foundation for enterprise applications.*