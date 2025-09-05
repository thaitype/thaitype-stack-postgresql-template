import { TRPCError } from '@trpc/server';
import type { AppContext } from '~/server/context/app-context';
import * as Err from '~/server/lib/errors/domain-errors';

/**
 * Standardized error handling for tRPC endpoints
 * Provides consistent error conversion, logging, and security practices
 */

export type ServiceErrorType = 
  | 'NOT_FOUND'
  | 'FORBIDDEN' 
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST'
  | 'INTERNAL_SERVER_ERROR';

/**
 * Maps domain service errors to appropriate tRPC errors with consistent logging
 */
export const handleServiceError = (
  error: unknown,
  operation: string,
  appContext: AppContext,
  metadata: Record<string, unknown> = {}
): TRPCError => {
  // Extract error details for comprehensive logging
  const errorDetails = Err.extractErrorDetails(error);
  
  // Log the full error details for debugging (server-side only)
  appContext.logger.error(`tRPC operation failed: ${operation}`, {
    ...errorDetails,
    operation,
    ...metadata,
  });

  // Handle structured domain errors (preferred approach)
  if (Err.isDomainError(error)) {
    if (Err.isNotFoundError(error)) {
      return new TRPCError({
        code: 'NOT_FOUND',
        message: error.message,
      });
    }

    if (Err.isForbiddenError(error)) {
      return new TRPCError({
        code: 'FORBIDDEN',
        message: error.message,
      });
    }

    if (Err.isValidationError(error)) {
      return new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message, // Safe to expose validation messages
      });
    }

    if (Err.isUnauthorizedError(error)) {
      return new TRPCError({
        code: 'UNAUTHORIZED',
        message: error.message,
      });
    }

    if (Err.isConflictError(error)) {
      return new TRPCError({
        code: 'CONFLICT',
        message: error.message,
      });
    }

    if (Err.isBusinessRuleError(error)) {
      return new TRPCError({
        code: 'BAD_REQUEST', // Map business rule to bad request
        message: error.message,
      });
    }

    if (Err.isExternalServiceError(error)) {
      return new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'External service temporarily unavailable', // Generic message
      });
    }

    if (Err.isRateLimitError(error)) {
      return new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: error.message,
      });
    }

    if (Err.isNotImplementedError(error)) {
      return new TRPCError({
        code: 'INTERNAL_SERVER_ERROR', // Map to 500 since tRPC doesn't have 501
        message: error.message,
      });
    }

    // Fallback for other domain errors
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    });
  }

  // NOTE: String-based error matching has been removed as all services now use structured domain errors.
  // If you encounter errors here, ensure the service is throwing proper domain errors (Err.*Error)
  // instead of raw Error objects with string messages.

  // Default to internal server error for unknown errors
  // Never expose internal error details to clients
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
  });
};

/**
 * Handles errors that are already TRPCErrors (re-throw) or converts service errors
 */
export const handleTRPCError = (
  error: unknown,
  operation: string,
  appContext: AppContext,
  metadata: Record<string, unknown> = {}
): never => {
  // If it's already a TRPCError, just re-throw it
  if (error instanceof TRPCError) {
    // Still log for monitoring
    appContext.logger.warn(`tRPC error re-thrown: ${operation}`, {
      code: error.code,
      message: error.message,
      operation,
      ...metadata,
    });
    throw error;
  }

  // Convert service error to TRPCError and throw
  throw handleServiceError(error, operation, appContext, metadata);
};

/**
 * Wrapper for consistent error handling in tRPC query/mutation handlers
 */
export const withErrorHandling = <T>(
  operation: string,
  appContext: AppContext,
  metadata: Record<string, unknown> = {}
) => {
  return {
    catch: (handler: () => Promise<T>): Promise<T> => {
      return handler().catch((error) => {
        throw handleServiceError(error, operation, appContext, metadata);
      });
    }
  };
};

/**
 * Success logger for consistent operation logging
 */
export const logSuccess = (
  operation: string,
  appContext: AppContext,
  metadata: Record<string, unknown> = {}
): void => {
  appContext.logger.info(`tRPC operation succeeded: ${operation}`, {
    operation,
    ...metadata,
  });
};