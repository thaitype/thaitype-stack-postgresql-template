import type { ILogger } from '@thaitype/core-utils';
import pino from 'pino';

/**
 * Pino implementation of the ILogger interface
 * Provides structured logging with proper log levels and metadata support
 */
export class PinoLogger implements ILogger {
  private pinoInstance: pino.Logger;
  public readonly level: 'silent' | 'error' | 'warn' | 'info' | 'debug';

  constructor(
    options: {
      level?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
      environment?: 'development' | 'production' | 'test';
    } = {}
  ) {
    this.level = options.level ?? 'info';

    // Configure pino based on environment
    const pinoConfig: pino.LoggerOptions = {
      level: this.mapLogLevel(this.level),
      ...(options.environment === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            },
          }
        : {}),
      ...(options.environment === 'test'
        ? {
            level: 'silent', // Suppress logs in test environment
          }
        : {}),
    };

    this.pinoInstance = pino(pinoConfig);
  }

  /**
   * Map ILogger levels to Pino levels
   */
  private mapLogLevel(level: 'silent' | 'error' | 'warn' | 'info' | 'debug'): string {
    const levelMap: Record<string, string> = {
      silent: 'silent',
      error: 'error',
      warn: 'warn',
      info: 'info',
      debug: 'debug',
    };
    return levelMap[level] ?? 'info';
  }

  /**
   * Core logging method with level specification
   */
  logWithLevel(level: 'error' | 'warn' | 'info' | 'debug', message: string, metadata?: Record<string, unknown>): void {
    if (metadata) {
      this.pinoInstance[level](metadata, message);
    } else {
      this.pinoInstance[level](message);
    }
  }

  /**
   * General logging method (defaults to info level)
   */
  log(message: string, metadata?: Record<string, unknown>): void {
    this.logWithLevel('info', message, metadata);
  }

  /**
   * Info level logging
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.logWithLevel('info', message, metadata);
  }

  /**
   * Warning level logging
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.logWithLevel('warn', message, metadata);
  }

  /**
   * Error level logging
   */
  error(message: string, metadata?: Record<string, unknown>): void {
    this.logWithLevel('error', message, metadata);
  }

  /**
   * Debug level logging
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.logWithLevel('debug', message, metadata);
  }
}
