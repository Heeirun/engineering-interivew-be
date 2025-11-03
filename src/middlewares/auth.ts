import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../utils/database';
import { UnauthorizedError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function authMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  // Extract userId from header or query parameter
  let userId = request.headers['x-user-id'] as string | undefined;

  if (!userId) {
    // Fallback to query parameter
    const query = request.query as { userId?: string };
    userId = query.userId;
  }

  if (!userId) {
    throw new UnauthorizedError('Missing user identifier. Provide x-user-id header or userId query parameter.');
  }

  // Validate UUID format
  if (!UUID_REGEX.test(userId)) {
    throw new UnauthorizedError('Invalid user identifier format.');
  }

  // Verify user exists in database
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new UnauthorizedError('User not found.');
  }

  // Attach userId to request for downstream use
  (request as AuthenticatedRequest).userId = userId;
}
