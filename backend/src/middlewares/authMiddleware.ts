import { PrivyClient } from '@privy-io/server-auth';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { prismaQuery } from '../lib/prisma.ts';
import { PRIVY_APP_ID, PRIVY_APP_SECRET } from '../config/main-config.ts';
import { handleError } from '../utils/errorHandler.ts';

// initialize privy client
const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);

// verified claims from privy token
interface PrivyClaims {
  userId: string;
  appId: string;
  issuer: string;
  issuedAt: number;
  expiration: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    privyClaims?: PrivyClaims;
    user?: {
      id: string;
      privyId: string;
      walletAddress: string | null;
      email: string | null;
      lastSignIn: Date | null;
      createdAt: Date;
      updatedAt: Date;
    };
  }
}

/**
 * Auth middleware that verifies Privy access tokens
 * Sets request.privyClaims with token claims
 * Sets request.user if user exists in database
 */
export const authMiddleware = async (request: FastifyRequest, reply: FastifyReply): Promise<true | FastifyReply> => {
  // check authorization header
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return handleError(reply, 401, 'Missing or invalid authorization header', 'MISSING_AUTH_HEADER');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return handleError(reply, 401, 'Token not provided', 'TOKEN_MISSING');
  }

  // verify privy token
  let claims: PrivyClaims;
  try {
    const verifiedClaims = await privy.verifyAuthToken(token);
    claims = {
      userId: verifiedClaims.userId,
      appId: verifiedClaims.appId,
      issuer: verifiedClaims.issuer,
      issuedAt: verifiedClaims.issuedAt,
      expiration: verifiedClaims.expiration,
    };
  } catch (error) {
    console.log(`Privy token verification failed: ${error}`);
    return handleError(reply, 401, 'Invalid or expired token', 'INVALID_TOKEN', error as Error);
  }

  // check app id matches
  if (claims.appId !== PRIVY_APP_ID) {
    return handleError(reply, 401, 'Token issued for different app', 'INVALID_APP_ID');
  }

  request.privyClaims = claims;

  // try to find existing user
  const user = await prismaQuery.user.findUnique({
    where: {
      privyId: claims.userId,
    },
  });

  if (user) {
    request.user = user;
  }

  return true;
};

/**
 * Strict auth middleware that requires user to exist in database
 * Use this for protected routes where user must already be registered
 */
export const strictAuthMiddleware = async (request: FastifyRequest, reply: FastifyReply): Promise<true | FastifyReply> => {
  const result = await authMiddleware(request, reply);
  if (result !== true) return result;

  if (!request.user) {
    return handleError(reply, 401, 'User not found in database', 'USER_NOT_FOUND');
  }

  return true;
};

// export privy client for use in routes
export { privy };
