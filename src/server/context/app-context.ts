import type { ILogger } from '@thaitype/core-utils';
import { createLogger } from '~/server/infrastructure/logging/logger-factory';
import type { AppConfig } from '~/server/config/types';
import { createAppConfig } from '~/server/config/types';
import { UserService, TodoService } from '~/server/services';
import type { IUserRepository, ITodoRepository } from '~/server/domain/repositories';
import { MongoUserRepository, MongoTodoRepository } from '~/server/infrastructure/repositories';
import { MongoClient } from 'mongodb';
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
 * Container configuration for dependency injection
 */
export interface ContainerConfig {
  mongodb: {
    url: string;
    dbName: string;
  };
}

/**
 * Creates the service container with all dependencies
 */
export async function createContainer(config: ContainerConfig): Promise<ServiceContainer> {
  // Create logger
  const logger = createLogger({
    level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    environment: env.NODE_ENV,
  });

  // Create app config
  const appConfig = createAppConfig();

  // Create app context
  const appContext: AppContext = {
    logger,
    config: appConfig,
  };

  // Create MongoDB connection
  const mongoClient = new MongoClient(config.mongodb.url);
  await mongoClient.connect();
  const db = mongoClient.db(config.mongodb.dbName);

  // Create repositories
  const userRepository: IUserRepository = new MongoUserRepository(appContext, db);
  const todoRepository: ITodoRepository = new MongoTodoRepository(appContext, db);

  // Create services
  const userService = new UserService(appContext, userRepository);
  const todoService = new TodoService(appContext, todoRepository);

  return {
    appContext,
    userService,
    todoService,
  };
}
