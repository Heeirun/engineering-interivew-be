import { FastifyInstance } from 'fastify';
import { taskService } from '../services/task.service';
import { authMiddleware } from '../middlewares/auth';
import {
  AuthenticatedRequest,
  CreateTaskBody,
  UpdateTaskBody,
  TaskFilters,
  TaskQueryString,
} from '../types';
import {
  createTaskSchema,
  updateTaskSchema,
  getTaskSchema,
  listTasksSchema,
  deleteTaskSchema,
  archiveTaskSchema,
} from '../validators/task';

export async function taskRoutes(fastify: FastifyInstance) {
  // List user's tasks with optional status filter
  fastify.get(
    '/',
    {
      preHandler: authMiddleware,
      schema: listTasksSchema,
    },
    async (request: AuthenticatedRequest, reply) => {
      const query = request.query as TaskQueryString;
      const filters: TaskFilters = {
        status: query.status,
      };

      const tasks = await taskService.getTasks(request.userId!, filters);

      return reply.send({
        success: true,
        data: tasks,
      });
    },
  );

  // Create new task
  fastify.post(
    '/',
    {
      preHandler: authMiddleware,
      schema: createTaskSchema,
    },
    async (request: AuthenticatedRequest, reply) => {
      const data = request.body as CreateTaskBody;
      const task = await taskService.createTask(request.userId!, data);

      return reply.status(201).send({
        success: true,
        data: task,
      });
    },
  );

  // Get specific task
  fastify.get(
    '/:id',
    {
      preHandler: authMiddleware,
      schema: getTaskSchema,
    },
    async (request: AuthenticatedRequest, reply) => {
      const { id } = request.params as { id: string };
      const task = await taskService.getTaskById(id, request.userId!);

      return reply.send({
        success: true,
        data: task,
      });
    },
  );

  // Update task
  fastify.patch(
    '/:id',
    {
      preHandler: authMiddleware,
      schema: updateTaskSchema,
    },
    async (request: AuthenticatedRequest, reply) => {
      const { id } = request.params as { id: string };
      const data = request.body as UpdateTaskBody;
      const task = await taskService.updateTask(id, request.userId!, data);

      return reply.send({
        success: true,
        data: task,
      });
    },
  );

  // Delete task
  fastify.delete(
    '/:id',
    {
      preHandler: authMiddleware,
      schema: deleteTaskSchema,
    },
    async (request: AuthenticatedRequest, reply) => {
      const { id } = request.params as { id: string };
      await taskService.deleteTask(id, request.userId!);

      return reply.status(204).send();
    },
  );

  // Archive task (convenience endpoint)
  fastify.post(
    '/:id/archive',
    {
      preHandler: authMiddleware,
      schema: archiveTaskSchema,
    },
    async (request: AuthenticatedRequest, reply) => {
      const { id } = request.params as { id: string };
      const task = await taskService.archiveTask(id, request.userId!);

      return reply.send({
        success: true,
        data: task,
      });
    },
  );
}
