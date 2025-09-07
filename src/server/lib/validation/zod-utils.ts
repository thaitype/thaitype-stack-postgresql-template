import { z } from 'zod';

/**
 * Zod schema for UUID validation
 */
export const zUuid = z.string().uuid('Invalid UUID format');

/**
 * Optional UUID schema - accepts string or undefined, validates valid strings
 */
export const zUuidOptional = z.string().uuid('Invalid UUID format').optional();

/**
 * Array of UUIDs schema - accepts string[], validates each
 */
export const zUuidArray = z.array(z.string().uuid('Invalid UUID format'));

// Backward compatibility aliases (for gradual migration)
export const zObjectId = zUuid;
export const zObjectIdOptional = zUuidOptional;
export const zObjectIdArray = zUuidArray;

/**
 * Type assertion helper to ensure schema output exactly matches expected type
 * Provides compile-time safety between Zod schemas and entity types
 */
export type AssertEqual<T, U> = (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 
  ? true 
  : false;

/**
 * Schema type matcher function that ensures Zod schema output exactly matches target type T
 * Usage: matches<EntityType>()(zodSchema) 
 * 
 * Benefits:
 * - Compile-time type safety between schemas and entity types
 * - Prevents type drift between validation schemas and database entities
 * - Forces schema updates when entity types change
 * 
 * @example
 * ```typescript
 * type UserUpdate = Pick<DbUser, 'name' | 'email'>;
 * 
 * const UserUpdateSchema = matches<UserUpdate>()(
 *   z.object({
 *     name: z.string().optional(),
 *     email: z.string().email().optional(),
 *   }).partial()
 * );
 * ```
 */
export const matches = <T>() => <S extends z.ZodType<T, z.ZodTypeDef, unknown>>(
  schema: AssertEqual<S['_output'], T> extends true
    ? S
    : S & {
        'types do not match': {
          expected: T;
          received: S['_output'];
        };
      }
): S => schema;

/**
 * Utility type for extracting the output type from a Zod schema
 * Useful for type annotations and ensuring consistency
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferSchemaOutput<T extends z.ZodType<any, any, any>> = T['_output'];

/**
 * Common validation patterns for reuse across schemas
 */
export const commonValidation = {
  /**
   * Slug validation - lowercase letters, numbers, and hyphens only
   */
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  
  /**
   * Non-empty string validation
   */
  nonEmptyString: z.string().min(1, 'String cannot be empty'),
  
  /**
   * URL validation
   */
  url: z.string().url('Must be a valid URL'),
  
  /**
   * Course/Product visibility enum
   */
  visibility: z.enum(['public', 'private', 'unlisted']),
  
  /**
   * Course/Product status enum
   */
  status: z.enum(['draft', 'active', 'archived']),
  
  /**
   * Email validation
   */
  email: z.string().email('Must be a valid email address'),
} as const;

/**
 * Error handling utility for Zod validation failures
 * Converts Zod errors to user-friendly validation error messages
 */
export function formatZodError(error: z.ZodError): string {
  const messages = error.errors.map(err => {
    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
    return `${path}${err.message}`;
  });
  
  return messages.join('; ');
}

/**
 * Safe parsing utility that throws ValidationError on failure
 * Integrates with existing error handling patterns
 */
export function safeParse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  
  if (!result.success) {
    const message = formatZodError(result.error);
    throw new Error(`Validation failed: ${message}`);
  }
  
  return result.data;
}