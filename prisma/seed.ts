import { PrismaClient, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const user1 = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob Smith',
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'charlie@example.com',
      name: 'Charlie Brown',
    },
  });

  // Create tasks for user1
  await prisma.task.createMany({
    data: [
      {
        title: 'Setup development environment',
        description: 'Install Node.js, Docker, and IDE',
        status: TaskStatus.DONE,
        userId: user1.id,
      },
      {
        title: 'Review API documentation',
        description: 'Go through the API specs and requirements',
        status: TaskStatus.IN_PROGRESS,
        userId: user1.id,
      },
      {
        title: 'Write unit tests',
        description: 'Add test coverage for the service layer',
        status: TaskStatus.TODO,
        userId: user1.id,
      },
      {
        title: 'Old project cleanup',
        description: 'Archive files from the previous project',
        status: TaskStatus.ARCHIVED,
        userId: user1.id,
      },
    ],
  });

  // Create tasks for user2
  await prisma.task.createMany({
    data: [
      {
        title: 'Database migration',
        description: 'Update schema and run migrations',
        status: TaskStatus.TODO,
        userId: user2.id,
      },
      {
        title: 'Fix authentication bug',
        description: 'Users cannot login with special characters in password',
        status: TaskStatus.IN_PROGRESS,
        userId: user2.id,
      },
      {
        title: 'Deploy to staging',
        description: 'Push latest changes to staging environment',
        status: TaskStatus.DONE,
        userId: user2.id,
      },
    ],
  });

  // Create tasks for user3
  await prisma.task.createMany({
    data: [
      {
        title: 'Code review',
        description: 'Review pull requests from team members',
        status: TaskStatus.TODO,
        userId: user3.id,
      },
      {
        title: 'Update dependencies',
        description: 'Upgrade packages to latest versions',
        status: TaskStatus.TODO,
        userId: user3.id,
      },
    ],
  });

  console.log('Database seeded successfully!');
  console.log(`User 1 (Alice): ${user1.id}`);
  console.log(`User 2 (Bob): ${user2.id}`);
  console.log(`User 3 (Charlie): ${user3.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
