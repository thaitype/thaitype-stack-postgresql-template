import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Helper function to create localhost URL with dynamic port
const createLocalhostUrl = (port = '3000') => `http://localhost:${port}`;

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    // Server Configuration
    NODE_ENV: z.enum(["development", "test", "production"]),
    PORT: z
      .string()
      .regex(/^\d+$/, 'Port must be a numeric string')
      .default('3000')
      .transform(Number),

    // Database Configuration
    MONGODB_URI: z
      .string()
      .url('MONGODB_URI must be a valid URL')
      .default('mongodb://localhost:27017'),
    DB_NAME: z
      .string()
      .min(1, 'DB_NAME cannot be empty')
      .default('agent_support'),

    // Authentication Configuration
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters for security')
      .default('your-secret-key-change-in-production'),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // Better Auth URL (client-side)
    NEXT_PUBLIC_BETTER_AUTH_URL: z
      .string()
      .url('NEXT_PUBLIC_BETTER_AUTH_URL must be a valid URL')
      .default(createLocalhostUrl(process.env.PORT)),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    MONGODB_URI: process.env.MONGODB_URI,
    DB_NAME: process.env.DB_NAME,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
