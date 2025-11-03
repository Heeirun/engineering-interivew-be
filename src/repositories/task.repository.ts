import { prisma } from '../utils/database';
import { Task, TaskStatus } from '@prisma/client';
import { CreateTaskBody, UpdateTaskBody, TaskFilters } from '../types';

export class TaskRepository {
  async findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string, filters?: TaskFilters): Promise<Task[]> {
    return prisma.task.findMany({
      where: {
        userId,
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(userId: string, data: CreateTaskBody): Promise<Task> {
    return prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status || TaskStatus.TODO,
        userId,
      },
    });
  }

  async update(id: string, data: UpdateTaskBody): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status && { status: data.status }),
      },
    });
  }

  async delete(id: string): Promise<Task> {
    return prisma.task.delete({
      where: { id },
    });
  }

  async archive(id: string): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.ARCHIVED,
      },
    });
  }
}

export const taskRepository = new TaskRepository();
