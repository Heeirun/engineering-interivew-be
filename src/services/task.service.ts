import { Task } from '@prisma/client';
import { taskRepository } from '../repositories/task.repository';
import { CreateTaskBody, UpdateTaskBody, TaskFilters } from '../types';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export class TaskService {
  async getTasks(userId: string, filters?: TaskFilters): Promise<Task[]> {
    return taskRepository.findByUserId(userId, filters);
  }

  async getTaskById(taskId: string, userId: string): Promise<Task> {
    const task = await taskRepository.findById(taskId);

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Authorization check: ensure task belongs to user
    if (task.userId !== userId) {
      throw new ForbiddenError('You do not have access to this task');
    }

    return task;
  }

  async createTask(userId: string, data: CreateTaskBody): Promise<Task> {
    return taskRepository.create(userId, data);
  }

  async updateTask(taskId: string, userId: string, data: UpdateTaskBody): Promise<Task> {
    const task = await taskRepository.findById(taskId);

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Authorization check
    if (task.userId !== userId) {
      throw new ForbiddenError('You do not have access to this task');
    }

    return taskRepository.update(taskId, data);
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    const task = await taskRepository.findById(taskId);

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Authorization check
    if (task.userId !== userId) {
      throw new ForbiddenError('You do not have access to this task');
    }

    await taskRepository.delete(taskId);
  }

  async archiveTask(taskId: string, userId: string): Promise<Task> {
    const task = await taskRepository.findById(taskId);

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Authorization check
    if (task.userId !== userId) {
      throw new ForbiddenError('You do not have access to this task');
    }

    return taskRepository.archive(taskId);
  }
}

export const taskService = new TaskService();
