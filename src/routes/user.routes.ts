import { FastifyInstance } from 'fastify';
import { userService } from '../services/user.service';
import { CreateUserBody } from '../types';
import { createUserSchema, getUserSchema } from '../validators/user';

export async function userRoutes(fastify: FastifyInstance) {
  // Create user (for testing purposes)
  fastify.post(
    '/',
    {
      schema: createUserSchema,
    },
    async (request, reply) => {
      const data = request.body as CreateUserBody;
      const user = await userService.createUser(data);

      return reply.status(201).send({
        success: true,
        data: user,
      });
    },
  );

  // Get user by ID (for testing purposes)
  fastify.get(
    '/:id',
    {
      schema: getUserSchema,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await userService.getUserById(id);

      return reply.send({
        success: true,
        data: user,
      });
    },
  );
}
