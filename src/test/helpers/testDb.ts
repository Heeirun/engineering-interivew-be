import { PrismaClient } from '@prisma/client';

export const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://taskuser:taskpass@localhost:5432/taskdb',
    },
  },
  log: ['error'],
});

/**
 * Clean up the database before/after tests
 */
export async function cleanDatabase() {
  // Delete in order to respect foreign key constraints
  await testDb.task.deleteMany();
  await testDb.user.deleteMany();
}

/**
 * Disconnect from the test database
 */
export async function disconnectDatabase() {
  await testDb.$disconnect();
}

/**
 * Create a test user
 */
export async function createTestUser(email: string = 'test@example.com', name: string = 'Test User') {
  return testDb.user.create({
    data: {
      email,
      name,
    },
  });
}

/**
 * Create multiple test users
 */
export async function createTestUsers(count: number = 2) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser(`user${i}@example.com`, `User ${i}`);
    users.push(user);
  }
  return users;
}
