import type { ILogger } from '@thaitype/core-utils';
import { createLogger } from '~/server/infrastructure/logging/logger-factory';
import type { AppConfig } from '~/server/config/types';
import { createAppConfig } from '~/server/config/types';
import { UserService, TodoService } from '~/server/services';
import type { IUserRepository, ITodoRepository } from '~/server/domain/repositories';
import { DrizzleTodoRepository, DrizzleUserRepository } from '~/server/infrastructure/repositories';
import { initializeDatabaseConfig as initDbConfig } from '~/server/lib/db';
import { env } from '~/env';

/**
 * Application context containing all shared dependencies
 * This provides a centralized way to pass dependencies throughout the application
 */
export interface AppContext {
  logger: ILogger;
  config: AppConfig;
}

/**
 * Service container interface with all services
 */
export interface ServiceContainer {
  appContext: AppContext;
  userService: UserService;
  todoService: TodoService;
}

/**
 * Configuration for creating the application context
 */
export interface AppContextConfig {
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  environment?: 'development' | 'production' | 'test';
}

/**
 * Creates the service container with all dependencies
 */
export async function createContainer(): Promise<ServiceContainer> {
  // Create logger
  const logger = createLogger({
    level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    environment: env.NODE_ENV,
  });

  // Create app config
  const appConfig = createAppConfig();

  // Initialize database configuration
  initDbConfig(appConfig.database, appConfig.server.nodeEnv);

  // Create app context
  const appContext: AppContext = {
    logger,
    config: appConfig,
  };

  // Create repositories (Drizzle will handle database connection internally)
  const todoRepository: ITodoRepository = new DrizzleTodoRepository(appContext);
  const userRepository: IUserRepository = new DrizzleUserRepository(appContext);

  // Create services
  const userService = new UserService(appContext, userRepository);
  const todoService = new TodoService(appContext, todoRepository);

  return {
    appContext,
    userService,
    todoService,
  };
}
