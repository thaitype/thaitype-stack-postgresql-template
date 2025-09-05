import { env } from '~/env';

/**
 * Server configuration extracted from environment variables
 */
export interface ServerConfig {
  readonly port: number;
  readonly nodeEnv: 'development' | 'production' | 'test';
}

/**
 * Database configuration extracted from environment variables
 */
export interface DatabaseConfig {
  readonly url: string;
}

/**
 * Authentication configuration extracted from environment variables
 */
export interface AuthConfig {
  readonly secret: string;
  readonly baseUrl: string;
  readonly trustedOrigins: string[];
}

/**
 * Application configuration containing all service configurations
 */
export interface AppConfig {
  readonly server: ServerConfig;
  readonly database: DatabaseConfig;
  readonly auth: AuthConfig;
}

/**
 * Creates application configuration from validated environment variables
 */
export function createAppConfig(): AppConfig {
  return {
    server: {
      port: env.PORT,
      nodeEnv: env.NODE_ENV,
    },
    database: {
      url: env.DATABASE_URL,
    },
    auth: {
      secret: env.BETTER_AUTH_SECRET,
      baseUrl: env.NEXT_PUBLIC_BETTER_AUTH_URL,
      trustedOrigins: [
        'http://localhost:5173', // Vite dev server
        'http://localhost:3050', // Production
        'http://localhost:3051', // API server
      ],
    },
  };
}
