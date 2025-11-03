import { User } from '@prisma/client';
import { userRepository } from '../repositories/user.repository';
import { CreateUserBody } from '../types';
import { NotFoundError, ConflictError } from '../utils/errors';

export class UserService {
  async getUserById(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  async createUser(data: CreateUserBody): Promise<User> {
    // Check if email already exists
    const existingUser = await userRepository.findByEmail(data.email);

    if (existingUser) {
      throw new ConflictError('Email already in use');
    }

    return userRepository.create(data);
  }
}

export const userService = new UserService();
