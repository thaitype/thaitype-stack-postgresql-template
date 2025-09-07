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
import { users, roles } from '../infrastructure/db/schema';

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


    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Seed data summary:');
    console.log(`  - ${seedRoles.length} roles created`);

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