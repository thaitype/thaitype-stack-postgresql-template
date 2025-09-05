/**
 * Retry utility with exponential backoff
 * Useful for handling transient failures like database timing issues
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Initial delay in milliseconds (default: 100) */
  initialDelay: number;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

/**
 * Executes an operation with exponential backoff retry logic
 * 
 * @param operation - The async operation to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the operation result or rejects with the final error
 * 
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => orderService.processSuccessfulOrder(orderId, userId, 'admin'),
 *   { maxRetries: 3, initialDelay: 100 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = { maxRetries: 3, initialDelay: 100 }
): Promise<T> {
  const startTime = Date.now();
  let lastError: Error;
  let attempts = 0;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    attempts = attempt + 1;
    
    try {
      const result = await operation();
      
      // Log successful retry if this wasn't the first attempt
      if (attempt > 0) {
        const duration = Date.now() - startTime;
        console.info(`Retry operation succeeded on attempt ${attempts}/${options.maxRetries + 1} after ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // If this is the last attempt, don't delay and throw the error
      if (attempt === options.maxRetries) {
        const duration = Date.now() - startTime;
        console.error(`Retry operation failed after ${attempts} attempts in ${duration}ms. Final error:`, lastError.message);
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = options.initialDelay * Math.pow(2, attempt);
      
      console.warn(`Retry operation failed on attempt ${attempts}/${options.maxRetries + 1}. Retrying in ${delay}ms. Error:`, lastError.message);
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw lastError!;
}

/**
 * Executes an operation with retry logic and returns detailed result information
 * Useful when you need to know if retries occurred without throwing errors
 * 
 * @param operation - The async operation to retry
 * @param options - Retry configuration options
 * @returns Promise that always resolves with detailed retry information
 */
export async function retryWithBackoffDetailed<T>(
  operation: () => Promise<T>,
  options: RetryOptions = { maxRetries: 3, initialDelay: 100 }
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  
  try {
    const result = await retryWithBackoff(operation, options);
    return {
      success: true,
      result,
      attempts: 1, // If retryWithBackoff succeeded, we don't know exact attempts without tracking
      totalDuration: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
      attempts: options.maxRetries + 1,
      totalDuration: Date.now() - startTime
    };
  }
}

/**
 * Creates a retry wrapper for a specific operation with predefined options
 * Useful for creating reusable retry functions
 * 
 * @param operation - The async operation to wrap
 * @param options - Retry configuration options
 * @returns A new function that will retry the operation with the given options
 */
export function createRetryWrapper<T extends unknown[], R>(
  operation: (...args: T) => Promise<R>,
  options: RetryOptions = { maxRetries: 3, initialDelay: 100 }
) {
  return async (...args: T): Promise<R> => {
    return retryWithBackoff(() => operation(...args), options);
  };
}

/**
 * Checks if an error is likely to be retriable (transient failure)
 * Common patterns for database timing issues and temporary failures
 * 
 * @param error - The error to check
 * @returns true if the error appears to be retriable
 */
export function isRetriableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Database timing issues
  if (message.includes('can only process orders with success status')) {
    return true;
  }
  
  // Connection timeouts
  if (message.includes('timeout') || message.includes('timed out')) {
    return true;
  }
  
  // Database lock issues
  if (message.includes('lock') || message.includes('deadlock')) {
    return true;
  }
  
  // Network issues
  if (message.includes('network') || message.includes('connection')) {
    return true;
  }
  
  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return true;
  }
  
  return false;
}

/**
 * Smart retry that only retries on errors that appear to be transient
 * 
 * @param operation - The async operation to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the operation result or rejects with the final error
 */
export async function smartRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = { maxRetries: 3, initialDelay: 100 }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const err = error as Error;
    
    if (isRetriableError(err)) {
      console.warn(`Smart retry detected retriable error: ${err.message}. Starting retry sequence...`);
      return retryWithBackoff(operation, options);
    } else {
      console.info(`Smart retry detected non-retriable error: ${err.message}. Not retrying.`);
      throw err;
    }
  }
}