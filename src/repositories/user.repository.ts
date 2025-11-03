import { prisma } from '../utils/database';
import { User } from '@prisma/client';
import { CreateUserBody } from '../types';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: CreateUserBody): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
      },
    });
  }
}

export const userRepository = new UserRepository();
