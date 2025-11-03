import Fastify, { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { errorHandler } from '../../plugins/errorHandler';
import { taskRoutes } from '../../routes/task.routes';
import { userRoutes } from '../../routes/user.routes';

/**
 * Create a Fastify instance for testing
 * This doesn't start the server, just sets up the routes and plugins
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false, // Disable logging during tests
  });

  // Register plugins
  await fastify.register(rateLimit, {
    max: 1000, // Higher limit for tests
    timeWindow: '1 minute',
  });

  // Error handler
  fastify.setErrorHandler(errorHandler);

  // Health check endpoint
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });

  // API routes
  await fastify.register(taskRoutes, { prefix: '/api/tasks' });
  await fastify.register(userRoutes, { prefix: '/api/users' });

  return fastify;
}
