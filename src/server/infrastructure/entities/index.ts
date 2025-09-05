import type { AuditableDocument } from 'monguard';
import type { ObjectId } from 'mongodb';

export interface DbUserEntity extends AuditableDocument {
  email: string;
  name: string;
  roles: ('admin')[];
  // Better Auth additional fields
  bio?: string;
  avatar?: string;
  website?: string;
  isActive?: boolean; // Derived from deletedAt (optional for compatibility)
}

export interface DbTodoEntity extends AuditableDocument {
  _id: ObjectId;
  title: string;
  description?: string;
  completed: boolean;
  userId: ObjectId;
}
