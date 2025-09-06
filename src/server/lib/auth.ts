import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '~/env';
import { getDatabase } from './db';

// Lazy-initialized auth instance
let authInstance: ReturnType<typeof betterAuth> | null = null;

async function createAuthInstance() {
  // Get Drizzle database instance for Better Auth
  const db = await getDatabase();
  
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg', // PostgreSQL
    }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  user: {
    additionalFields: {
      // Additional fields for Monguard compatibility
      roles: {
        type: 'string[]',
        required: false,
        defaultValue: ['admin'],
        input: true, // Allow roles to be set programmatically
      },
      // Better Auth does not support ObjectId types directly,
      // Monguard auto-fields (managed by hooks)
    },
  },
  databaseHooks: {
    user: {
      // create: {
      //   after: handleUserCreate
      // },
      // update: {
      //   after: handleUserUpdate
      // },
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.NEXT_PUBLIC_BETTER_AUTH_URL,
  trustedOrigins: [env.NEXT_PUBLIC_BETTER_AUTH_URL],
  advanced: {
    // https://www.better-auth.com/docs/integrations/hono#cross-domain-cookies
    // TODO: Enable this if you need cross-domain cookies
    // This is useful if your frontend and backend are on different subdomains
    // In the production, I'll disable this
    crossSubDomainCookies: {
      enabled: true
    }
  }
  });
}

/**
 * Get the auth instance, creating it if necessary
 */
export async function getAuth() {
  authInstance ??= await createAuthInstance();
  return authInstance;
}

/**
 * Legacy export for compatibility - use getAuth() for new code
 * @deprecated Use getAuth() instead for proper async initialization
 */
export const auth = {
  get handler() {
    throw new Error('Use getAuth() for proper async initialization instead of auth.handler');
  },
  get api() {
    throw new Error('Use getAuth() for proper async initialization instead of auth.api');
  }
};
