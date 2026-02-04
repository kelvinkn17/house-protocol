import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, strictAuthMiddleware, privy } from '../middlewares/authMiddleware.ts';
import { prismaQuery } from '../lib/prisma.ts';
import { handleError, handleServerError } from '../utils/errorHandler.ts';

export const authRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  /**
   * POST /auth/verify
   * Verify privy token and create/update user in database
   * This is the main endpoint for frontend to call after privy login
   */
  app.post('/verify', { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const claims = request.privyClaims;
      if (!claims) {
        return handleError(reply, 401, 'No auth claims found', 'NO_CLAIMS');
      }

      // get full user data from privy
      let privyUser;
      try {
        privyUser = await privy.getUser(claims.userId);
      } catch (error) {
        console.error('Failed to fetch privy user:', error);
        return handleError(reply, 500, 'Failed to fetch user data from Privy', 'PRIVY_FETCH_ERROR', error as Error);
      }

      // extract email and wallet from privy user
      const emailAccount = privyUser.linkedAccounts.find(
        (a) => a.type === 'email' || a.type === 'google_oauth'
      );
      const walletAccount = privyUser.linkedAccounts.find((a) => a.type === 'wallet');

      const email = emailAccount?.type === 'email'
        ? emailAccount.address
        : emailAccount?.type === 'google_oauth'
          ? emailAccount.email
          : null;
      const walletAddress = walletAccount?.type === 'wallet' ? walletAccount.address : null;

      // upsert user in database
      const user = await prismaQuery.user.upsert({
        where: {
          privyId: claims.userId,
        },
        create: {
          privyId: claims.userId,
          email,
          walletAddress,
          lastSignIn: new Date(),
        },
        update: {
          email,
          walletAddress,
          lastSignIn: new Date(),
        },
      });

      return reply.status(200).send({
        success: true,
        error: null,
        data: {
          user: {
            id: user.id,
            privyId: user.privyId,
            walletAddress: user.walletAddress,
            email: user.email,
          },
        },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  /**
   * GET /auth/me
   * Get current user data
   * Requires user to exist in database
   */
  app.get('/me', { preHandler: [strictAuthMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user;
      if (!user) {
        return handleError(reply, 401, 'User not found', 'USER_NOT_FOUND');
      }

      return reply.status(200).send({
        success: true,
        error: null,
        data: {
          user: {
            id: user.id,
            privyId: user.privyId,
            walletAddress: user.walletAddress,
            email: user.email,
          },
        },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  /**
   * POST /auth/refresh
   * Refresh user data from Privy (in case linked accounts changed)
   */
  app.post('/refresh', { preHandler: [strictAuthMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user;
      const claims = request.privyClaims;

      if (!user || !claims) {
        return handleError(reply, 401, 'User not found', 'USER_NOT_FOUND');
      }

      // get fresh data from privy
      let privyUser;
      try {
        privyUser = await privy.getUser(claims.userId);
      } catch (error) {
        console.error('Failed to fetch privy user:', error);
        return handleError(reply, 500, 'Failed to fetch user data from Privy', 'PRIVY_FETCH_ERROR', error as Error);
      }

      // extract email and wallet from privy user
      const emailAccount = privyUser.linkedAccounts.find(
        (a) => a.type === 'email' || a.type === 'google_oauth'
      );
      const walletAccount = privyUser.linkedAccounts.find((a) => a.type === 'wallet');

      const email = emailAccount?.type === 'email'
        ? emailAccount.address
        : emailAccount?.type === 'google_oauth'
          ? emailAccount.email
          : null;
      const walletAddress = walletAccount?.type === 'wallet' ? walletAccount.address : null;

      // update user
      const updatedUser = await prismaQuery.user.update({
        where: { id: user.id },
        data: {
          email,
          walletAddress,
        },
      });

      return reply.status(200).send({
        success: true,
        error: null,
        data: {
          user: {
            id: updatedUser.id,
            privyId: updatedUser.privyId,
            walletAddress: updatedUser.walletAddress,
            email: updatedUser.email,
          },
        },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  done();
};
