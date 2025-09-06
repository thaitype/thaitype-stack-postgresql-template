/**
 * Simple logger export for repository usage
 */
import { createLogger } from './logger-factory';

// Export a default logger instance for repository usage
export const logger = createLogger({ 
  environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') ?? 'development',
  level: 'info'
});