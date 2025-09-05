/**
 * Structured Domain Errors
 * 
 * Provides type-safe, consistent error handling across all services.
 * Each error class has a specific error code and HTTP status for proper API responses.
 */

/**
 * Base class for all domain errors
 * Provides structure and consistency for error handling
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Ensures proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Resource not found (404)
 * Use when a requested resource doesn't exist
 */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;
  
  constructor(message = 'Resource not found', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/**
 * Access forbidden (403) 
 * Use when user lacks permissions for the operation
 */
export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly httpStatus = 403;
  
  constructor(message = 'Access forbidden', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/**
 * Validation error (400)
 * Use for invalid input data, missing required fields, etc.
 */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;
  
  constructor(message = 'Invalid input', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/**
 * Authentication required (401)
 * Use when user is not authenticated
 */
export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
  readonly httpStatus = 401;
  
  constructor(message = 'Authentication required', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/**
 * Resource conflict (409)
 * Use when operation conflicts with current state (e.g. duplicate slug)
 */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
  readonly httpStatus = 409;
  
  constructor(message = 'Resource conflict', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/**
 * Business logic violation (422)
 * Use when request is well-formed but violates business rules
 */
export class BusinessRuleError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION';
  readonly httpStatus = 422;
  
  constructor(message = 'Business rule violation', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/**
 * External service error (502)
 * Use when external service (Stripe, Mux, etc.) fails
 */
export class ExternalServiceError extends DomainError {
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly httpStatus = 502;
  
  constructor(message = 'External service error', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/**
 * Rate limit exceeded (429)
 * Use when user exceeds rate limits
 */
export class RateLimitError extends DomainError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly httpStatus = 429;
  
  constructor(message = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/**
 * Database operation error (500)
 * Use when database operations fail unexpectedly
 */
export class DatabaseError extends DomainError {
  readonly code = 'DATABASE_ERROR';
  readonly httpStatus = 500;
  
  constructor(message = 'Database operation failed', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/**
 * Not implemented (501)
 * Use when functionality is not implemented or deprecated
 */
export class NotImplementedError extends DomainError {
  readonly code = 'NOT_IMPLEMENTED';
  readonly httpStatus = 501;
  
  constructor(message = 'Not implemented', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/**
 * Type guard to check if error is a domain error
 */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/**
 * Type guard for specific domain error types
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError;
}

export function isBusinessRuleError(error: unknown): error is BusinessRuleError {
  return error instanceof BusinessRuleError;
}

export function isExternalServiceError(error: unknown): error is ExternalServiceError {
  return error instanceof ExternalServiceError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isNotImplementedError(error: unknown): error is NotImplementedError {
  return error instanceof NotImplementedError;
}

/**
 * Utility to extract error details for logging
 */
export function extractErrorDetails(error: unknown): {
  message: string;
  code?: string;
  httpStatus?: number;
  details?: Record<string, unknown>;
  stack?: string;
} {
  if (isDomainError(error)) {
    return {
      message: error.message,
      code: error.code,
      httpStatus: error.httpStatus,
      details: error.details,
      stack: error.stack,
    };
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }
  
  return {
    message: String(error),
  };
}