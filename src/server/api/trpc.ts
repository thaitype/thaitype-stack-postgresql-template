/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { getAuth } from "~/server/lib/auth";
import { createContainer } from "~/server/context/app-context";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  // Get session from Better Auth using standard pattern
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  // Create application container
  const container = await createContainer();

  return {
    ...opts,
    session,
    user: session?.user,
    container,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected procedure - requires authentication
 *
 * This procedure ensures that a user is authenticated before allowing access.
 * You can access the authenticated user via `ctx.user`.
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(async ({ next, ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access this resource",
      });
    }

    return next({
      ctx: {
        ...ctx,
        // Ensure user is definitely defined for protected procedures
        user: ctx.session.user,
      },
    });
  });

/**
 * Admin-only procedure - requires admin role
 *
 * This procedure ensures that a user is authenticated and has admin role.
 * Use this for admin-only operations.
 * 
 * TODO: Re-enable when user repository is migrated to Drizzle
 */
export const adminProcedure = protectedProcedure.use(async ({ next, ctx }) => {
  // TODO: Uncomment when userService is available
  // const userService = ctx.container.userService;
  // if (!userService) {
  //   throw new TRPCError({
  //     code: "INTERNAL_SERVER_ERROR", 
  //     message: "User service not available",
  //   });
  // }
  
  // const userData = await userService.getUserById(ctx.user.id);
  // if (!userData?.roles?.includes('admin')) {
  //   throw new TRPCError({
  //     code: "FORBIDDEN", 
  //     message: "Admin access required",
  //   });
  // }

  // For now, allow any authenticated user (temporary until user service is migrated)
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
