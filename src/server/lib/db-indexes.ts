import type { Db } from 'mongodb';

// Type for MongoDB index documents
interface IndexDocument {
  name: string;
  key: Record<string, number>;
  [key: string]: unknown;
}

/**
 * Creates all necessary MongoDB indexes for optimal performance.
 * This should be called during application startup or database migration.
 */
export async function createDatabaseIndexes(db: Db): Promise<void> {
  console.log('Creating database indexes...');

  try {
    // User collection indexes (changed from 'users' to 'user')
    await db.collection('user').createIndexes([
      { key: { email: 1 }, unique: true, name: 'email_unique' },
      { key: { roles: 1, deletedAt: 1 }, name: 'roles_active' },
      { key: { deletedAt: 1 }, name: 'soft_delete' },
      { key: { createdAt: 1 }, name: 'created_at' },
      { key: { updatedAt: 1 }, name: 'updated_at' },
      { key: { createdBy: 1 }, name: 'created_by' },
      { key: { updatedBy: 1 }, name: 'updated_by' },
    ]);

    // Audit logs collection indexes (for MonguardCollection audit functionality)
    await db.collection('audit_logs').createIndexes([
      { key: { collectionName: 1, documentId: 1 }, name: 'collection_document' },
      { key: { 'userContext.userId': 1 }, name: 'audit_user' },
      { key: { timestamp: 1 }, name: 'audit_timestamp' },
      { key: { operation: 1 }, name: 'audit_operation' },
    ]);

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating database indexes:', error);
    throw error;
  }
}

/**
 * Drops all custom indexes (excluding the default _id index).
 * Use with caution - only for development/testing purposes.
 */
export async function dropDatabaseIndexes(db: Db): Promise<void> {
  console.log('Dropping database indexes...');

  const collections = ['user', 'audit_logs'];

  try {
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const indexes = await collection.listIndexes().toArray();

      // Drop all indexes except the default _id index
      for (const index of indexes as IndexDocument[]) {
        if (index.name !== '_id_') {
          await collection.dropIndex(index.name);
          console.log(`Dropped index: ${index.name} from ${collectionName}`);
        }
      }
    }

    console.log('Database indexes dropped successfully');
  } catch (error) {
    console.error('Error dropping database indexes:', error);
    throw error;
  }
}

/**
 * Drops the unique constraint on paymentIntent.id to fix order-first flow issues.
 * This migration removes the problematic unique index that prevents multiple orders 
 * with empty/null payment intent IDs.
 */
export async function dropPaymentIntentUniqueIndex(db: Db): Promise<void> {
  console.log('Dropping unique index on paymentIntent.id...');

  try {
    const collection = db.collection('orders');
    
    // Check if the index exists
    const indexes = await collection.listIndexes().toArray();
    const hasUniqueIndex = (indexes as IndexDocument[]).some(index => index.name === 'payment_intent_id_unique');
    
    if (hasUniqueIndex) {
      await collection.dropIndex('payment_intent_id_unique');
      console.log('✅ Successfully dropped payment_intent_id_unique index');
    } else {
      console.log('ℹ️  Index payment_intent_id_unique does not exist, skipping');
    }
  } catch (error) {
    console.error('Error dropping payment intent unique index:', error);
    throw error;
  }
}

/**
 * Fixes duplicate null idempotencyKey values in orders collection.
 * This migration ensures all orders have unique, non-null idempotencyKey values
 * so that the unique index can be created successfully.
 */
export async function fixIdempotencyKeyDuplicates(db: Db): Promise<void> {
  console.log('Fixing duplicate null idempotencyKey values in orders...');

  try {
    const collection = db.collection('orders');
    
    // Find all orders with null or missing idempotencyKey
    const ordersWithNullKeys = await collection.find({
      $or: [
        { idempotencyKey: null },
        { idempotencyKey: { $exists: false } }
      ]
    }).toArray();

    console.log(`Found ${ordersWithNullKeys.length} orders with null/missing idempotencyKey`);

    if (ordersWithNullKeys.length === 0) {
      console.log('✅ No orders with null idempotencyKey found, nothing to fix');
      return;
    }

    // Update each order with a unique idempotencyKey
    let updatedCount = 0;
    for (const order of ordersWithNullKeys) {
      // Generate a unique idempotencyKey using timestamp + random string
      const uniqueKey = `migration-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      await collection.updateOne(
        { _id: order._id },
        { 
          $set: { 
            idempotencyKey: uniqueKey,
            updatedAt: new Date()
          }
        }
      );
      updatedCount++;
    }

    console.log(`✅ Successfully updated ${updatedCount} orders with unique idempotencyKey values`);
  } catch (error) {
    console.error('Error fixing idempotencyKey duplicates:', error);
    throw error;
  }
}

/**
 * Lists all indexes for debugging and monitoring purposes.
 */
export async function listDatabaseIndexes(db: Db): Promise<void> {
  console.log('Listing database indexes...');

  const collections = ['user', 'audit_logs'];

  try {
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const indexes = await collection.listIndexes().toArray();

      console.log(`\n${collectionName} indexes:`);
      (indexes as IndexDocument[]).forEach(index => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      });
    }
  } catch (error) {
    console.error('Error listing database indexes:', error);
    throw error;
  }
}
