import { FastifyRequest } from 'fastify';
import { TaskStatus } from '@prisma/client';

export interface AuthenticatedRequest extends FastifyRequest {
  userId?: string;
}

export interface CreateTaskBody {
  title: string;
  description?: string;
  status?: TaskStatus;
}

export interface UpdateTaskBody {
  title?: string;
  description?: string;
  status?: TaskStatus;
}

export interface CreateUserBody {
  email: string;
  name: string;
}

export interface TaskFilters {
  status?: TaskStatus;
}

export { TaskStatus };
