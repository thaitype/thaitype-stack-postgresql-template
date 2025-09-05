import type { ILogger } from '@thaitype/core-utils';
import type { AppContextConfig } from '~/server/context/app-context';

import { PinoLogger } from './pino-logger';

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  environment?: 'development' | 'production' | 'test';
}

/**
 * Factory function to create logger instances
 * Centralizes logger creation and configuration
 * Note: environment is now required to avoid direct process.env access
 */
export function createLogger(config: LoggerConfig & { environment: 'development' | 'production' | 'test' }): ILogger {
  const environment = config.environment;
  const level = config.level ?? getDefaultLogLevel(environment);

  return new PinoLogger({
    level,
    environment,
  });
}

/**
 * Get default log level based on environment
 */
function getDefaultLogLevel(environment: string): 'silent' | 'error' | 'warn' | 'info' | 'debug' {
  switch (environment) {
    case 'production':
      return 'info';
    case 'development':
      return 'debug';
    case 'test':
      return 'silent';
    default:
      return 'info';
  }
}

/**
 * Create logger from app context config
 */
export function createLoggerFromConfig(config: AppContextConfig): ILogger {
  return createLogger({
    level: config.logLevel,
    environment: config.environment ?? 'development',
  });
}
