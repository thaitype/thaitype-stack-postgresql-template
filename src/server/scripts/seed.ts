/**
 * Database Seed Script
 * 
 * Seeds the database with sample data for development and testing.
 * This script can be run to populate a fresh database with realistic data.
 */
import 'dotenv/config';
import { getDatabase } from '../lib/db';
import { initializeDatabaseConfig } from '../lib/db';
import { createAppConfig } from '../config/types';
import { users, todos, roles, userRoles } from '../infrastructure/db/schema';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Initialize database configuration
    const appConfig = createAppConfig();
    initializeDatabaseConfig(appConfig.database, appConfig.server.nodeEnv);

    const db = await getDatabase();

    // Check if data already exists
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log('🔍 Database already contains data. Skipping seed.');
      return;
    }

    console.log('🏷️ Creating seed roles...');

    // Create seed roles first
    const seedRoles = [
      {
        name: 'admin',
        description: 'Administrator with full system access',
      },
      {
        name: 'user',
        description: 'Standard user with basic access',
      },
    ];

    const insertedRoles = await db.insert(roles).values(seedRoles).returning();
    console.log(`✅ Created ${seedRoles.length} roles`);

    const adminRole = insertedRoles.find(r => r.name === 'admin');
    const userRole = insertedRoles.find(r => r.name === 'user');

    if (!adminRole || !userRole) {
      throw new Error('Failed to create required seed roles');
    }

    console.log('👤 Creating seed users...');

    // Create seed users (without roles array - roles are normalized)
    const seedUsers = [
      {
        email: 'john@example.com',
        name: 'John Doe',
        isActive: true,
      },
      {
        email: 'admin@example.com',
        name: 'Admin User',
        isActive: true,
      },
    ];

    const insertedUsers = await db.insert(users).values(seedUsers).returning();
    console.log(`✅ Created ${seedUsers.length} users`);

    const user1 = insertedUsers[0];
    const user2 = insertedUsers[1];

    if (!user1 || !user2) {
      throw new Error('Failed to create required seed users');
    }

    console.log('🔗 Assigning roles to users...');

    // Assign roles to users via junction table
    const userRoleAssignments = [
      // John Doe: user role only
      {
        userId: user1.id,
        roleId: userRole.id,
      },
      // Admin User: both admin and user roles
      {
        userId: user2.id,
        roleId: adminRole.id,
      },
      {
        userId: user2.id,
        roleId: userRole.id,
      },
    ];

    await db.insert(userRoles).values(userRoleAssignments);
    console.log(`✅ Created ${userRoleAssignments.length} user-role assignments`);

    console.log('📝 Creating seed todos...');

    // Create seed todos
    const seedTodos = [
      {
        title: 'Learn Drizzle ORM',
        description: 'Study the documentation and build a sample project',
        completed: false,
        userId: user1.id,
      },
      {
        title: 'Set up PostgreSQL database',
        description: 'Configure local development database',
        completed: true,
        userId: user1.id,
      },
      {
        title: 'Write migration scripts',
        description: 'Create database schema migration files',
        completed: true,
        userId: user1.id,
      },
      {
        title: 'Review user permissions',
        description: 'Audit user access levels and roles',
        completed: false,
        userId: user2.id,
      },
      {
        title: 'Update system documentation',
        description: 'Keep documentation current with latest changes',
        completed: false,
        userId: user2.id,
      },
    ];

    await db.insert(todos).values(seedTodos);
    console.log(`✅ Created ${seedTodos.length} todos`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Seed data summary:');
    console.log(`  - ${seedRoles.length} roles created`);
    console.log(`  - ${seedUsers.length} users created`);
    console.log(`  - ${userRoleAssignments.length} user-role assignments created`);
    console.log(`  - ${seedTodos.length} todos created`);
    console.log('\n👥 Test accounts:');
    console.log('  - john@example.com (User role)');
    console.log('  - admin@example.com (Admin + User roles)');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().catch((error) => {
    console.error('Fatal seeding error:', error);
    process.exit(1);
  });
}

export { seedDatabase };