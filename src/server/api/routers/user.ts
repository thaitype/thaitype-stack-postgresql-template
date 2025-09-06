import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure, adminProcedure } from '~/server/api/trpc';
import { UpdateProfileSchema } from '~/server/schemas/user';

/**
 * tRPC router for User operations
 * Migrated from Hono REST API while preserving all business logic and authorization
 * Uses admin-only authentication model
 */
export const userRouter = createTRPCRouter({
  /**
   * Get users by IDs - public endpoint for instructor display
   */
  getUsersByIds: publicProcedure
    .input(z.object({
      userIds: z.array(z.string()).min(1).max(50), // Limit to prevent abuse
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userService = ctx.container.userService;
        
        // Fetch users by IDs - only return public information
        const users = await Promise.all(
          input.userIds.map(async (userId) => {
            try {
              const user = await userService.getUserById(userId);
              if (!user) return null;
              
              // Return only public information suitable for instructor display
              return {
                id: user.id,
                name: user.name || 'Unknown User',
                avatar: user.avatar,
              };
            } catch (error) {
              ctx.container.appContext.logger.warn('Failed to fetch user for display', {
                userId,
                error: error instanceof Error ? error.message : String(error),
              });
              return null;
            }
          })
        );

        // Filter out null values
        const validUsers = users.filter((user): user is NonNullable<typeof user> => user !== null);

        return {
          users: validUsers,
        };
      } catch (error) {
        ctx.container.appContext.logger.error('Error fetching users by IDs', {
          error: error instanceof Error ? error.message : String(error),
          userIds: input.userIds,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch users',
        });
      }
    }),

  /**
   * Get user profile - requires authentication
   */
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const user = ctx.user;
        const userService = ctx.container.userService;

        const userData = await userService.getUserById(user.id);

        if (!userData) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        return {
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            roles: userData.roles,
            bio: userData.bio,
            avatar: userData.avatar,
            website: userData.website,
            isActive: userData.isActive,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt,
          },
          session: ctx.session,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        ctx.container.appContext.logger.error('Error fetching user profile', {
          error: error instanceof Error ? error.message : String(error),
          userId: ctx.user?.id,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        });
      }
    }),

  /**
   * Update user profile - requires authentication
   */
  updateProfile: protectedProcedure
    .input(UpdateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const user = ctx.user;
        const userService = ctx.container.userService;

        const updatedUser = await userService.updateUserProfile(user.id, input);

        if (!updatedUser) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        ctx.container.appContext.logger.info('User profile updated via tRPC', {
          userId: user.id,
          email: updatedUser.email,
        });

        return {
          message: 'Profile updated successfully',
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            roles: updatedUser.roles,
            bio: updatedUser.bio,
            avatar: updatedUser.avatar,
            website: updatedUser.website,
            isActive: updatedUser.isActive,
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        ctx.container.appContext.logger.error('Error updating user profile', {
          error: error instanceof Error ? error.message : String(error),
          userId: ctx.user?.id,
        });

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    }),

  /**
   * Get all users - admin only
   */
  getAllUsers: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(20),
      skip: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userService = ctx.container.userService;

        const users = await userService.getAllUsers(
          {}, // No filter - get all users
          {
            limit: input.limit,
            skip: input.skip,
            sort: { createdAt: -1 }, // Latest first
          }
        );

        const totalCount = await userService.getUserCount();

        return {
          users,
          pagination: {
            total: totalCount,
            limit: input.limit,
            skip: input.skip,
            hasMore: input.skip + input.limit < totalCount,
          },
        };
      } catch (error) {
        ctx.container.appContext.logger.error('Error fetching all users', {
          error: error instanceof Error ? error.message : String(error),
          userId: ctx.user?.id,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch users',
        });
      }
    }),

  /**
   * Get user by ID - admin only
   */
  getUserById: adminProcedure
    .input(z.object({
      userId: z.string().min(1),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userService = ctx.container.userService;
        const user = await userService.getUserById(input.userId);

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        return { user };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        ctx.container.appContext.logger.error('Error fetching user by ID', {
          error: error instanceof Error ? error.message : String(error),
          userId: ctx.user?.id,
          targetUserId: input.userId,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user',
        });
      }
    }),
});