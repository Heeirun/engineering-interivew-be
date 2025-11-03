import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { errorHandler } from './plugins/errorHandler';
import { taskRoutes } from './routes/task.routes';
import { userRoutes } from './routes/user.routes';
import { prisma } from './utils/database';

const fastify = Fastify({
  logger: {
    level: config.logLevel,
    transport: config.isDev
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
});

// Register plugins
async function registerPlugins() {
  // Rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Error handler
  fastify.setErrorHandler(errorHandler);

  // Request/Response logging
  fastify.addHook('onRequest', async (request) => {
    request.log.info({ url: request.url, method: request.method }, 'Incoming request');
  });

  fastify.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        url: request.url,
        method: request.method,
        statusCode: reply.statusCode,
      },
      'Request completed',
    );
  });
}

// Register routes
async function registerRoutes() {
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
}

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerRoutes();

    await fastify.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    fastify.log.info(`Server listening on port ${config.port}`);
    fastify.log.info(`Environment: ${config.nodeEnv}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  try {
    fastify.log.info('Shutting down server...');
    await fastify.close();
    await prisma.$disconnect();
    fastify.log.info('Server shut down successfully');
    process.exit(0);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
start();

export { fastify };
