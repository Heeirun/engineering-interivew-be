import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../test/helpers/testApp';
import { cleanDatabase, disconnectDatabase, createTestUsers, testDb } from '../test/helpers/testDb';
import { TaskStatus } from '@prisma/client';

describe('Task API Integration Tests', () => {
  let app: FastifyInstance;
  let testUser1Id: string;
  let testUser2Id: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();

    // Create test users
    const users = await createTestUsers(2);
    testUser1Id = users[0].id;
    testUser2Id = users[1].id;
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectDatabase();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up tasks before each test (but keep users)
    await testDb.task.deleteMany();
  });

  describe('POST /api/tasks - Create Task', () => {
    it('should create a new task with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: {
          'x-user-id': testUser1Id,
        },
        payload: {
          title: 'Test Task',
          description: 'Test Description',
          status: 'TODO',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        title: 'Test Task',
        description: 'Test Description',
        status: 'TODO',
        userId: testUser1Id,
      });
      expect(body.data.id).toBeDefined();
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
    });

    it('should create a task with minimal data (title only)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: {
          'x-user-id': testUser1Id,
        },
        payload: {
          title: 'Minimal Task',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Minimal Task');
      expect(body.data.status).toBe('TODO'); // Default status
      expect(body.data.description).toBeNull();
    });

    it('should return 401 when user ID is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: {
          title: 'Test Task',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 when title is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: {
          'x-user-id': testUser1Id,
        },
        payload: {
          description: 'No title',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when status is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: {
          'x-user-id': testUser1Id,
        },
        payload: {
          title: 'Test Task',
          status: 'INVALID_STATUS',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/tasks - List Tasks', () => {
    beforeEach(async () => {
      // Create test tasks for user1
      await testDb.task.createMany({
        data: [
          { title: 'Task 1', status: TaskStatus.TODO, userId: testUser1Id },
          { title: 'Task 2', status: TaskStatus.IN_PROGRESS, userId: testUser1Id },
          { title: 'Task 3', status: TaskStatus.DONE, userId: testUser1Id },
          { title: 'Task 4', status: TaskStatus.ARCHIVED, userId: testUser1Id },
        ],
      });

      // Create tasks for user2
      await testDb.task.createMany({
        data: [
          { title: 'User2 Task', status: TaskStatus.TODO, userId: testUser2Id },
        ],
      });
    });

    it('should return all tasks for authenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tasks',
        headers: {
          'x-user-id': testUser1Id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(4);
      expect(body.data.every((task: any) => task.userId === testUser1Id)).toBe(true);
    });

    it('should filter tasks by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tasks?status=TODO',
        headers: {
          'x-user-id': testUser1Id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].status).toBe('TODO');
    });

    it('should not return tasks from other users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tasks',
        headers: {
          'x-user-id': testUser2Id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('User2 Task');
    });

    it('should return 401 when user ID is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tasks',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/tasks/:id - Get Task by ID', () => {
    let taskId: string;
    let otherUserTaskId: string;

    beforeEach(async () => {
      const task = await testDb.task.create({
        data: {
          title: 'Test Task',
          status: TaskStatus.TODO,
          userId: testUser1Id,
        },
      });
      taskId = task.id;

      const otherTask = await testDb.task.create({
        data: {
          title: 'Other User Task',
          status: TaskStatus.TODO,
          userId: testUser2Id,
        },
      });
      otherUserTaskId = otherTask.id;
    });

    it('should return task by ID for authorized user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/tasks/${taskId}`,
        headers: {
          'x-user-id': testUser1Id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(taskId);
      expect(body.data.title).toBe('Test Task');
    });

    it('should return 403 when accessing another user\'s task', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/tasks/${otherUserTaskId}`,
        headers: {
          'x-user-id': testUser1Id,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 when task does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'GET',
        url: `/api/tasks/${fakeId}`,
        headers: {
          'x-user-id': testUser1Id,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tasks/invalid-uuid',
        headers: {
          'x-user-id': testUser1Id,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/tasks/:id - Update Task', () => {
    let taskId: string;
    let otherUserTaskId: string;

    beforeEach(async () => {
      const task = await testDb.task.create({
        data: {
          title: 'Original Title',
          description: 'Original Description',
          status: TaskStatus.TODO,
          userId: testUser1Id,
        },
      });
      taskId = task.id;

      const otherTask = await testDb.task.create({
        data: {
          title: 'Other Task',
          status: TaskStatus.TODO,
          userId: testUser2Id,
        },
      });
      otherUserTaskId = otherTask.id;
    });

    it('should update task title', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${taskId}`,
        headers: {
          'x-user-id': testUser1Id,
        },
        payload: {
          title: 'Updated Title',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Updated Title');
      expect(body.data.description).toBe('Original Description'); // Unchanged
    });

    it('should update task status', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${taskId}`,
        headers: {
          'x-user-id': testUser1Id,
        },
        payload: {
          status: 'IN_PROGRESS',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.status).toBe('IN_PROGRESS');
    });

    it('should update multiple fields', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${taskId}`,
        headers: {
          'x-user-id': testUser1Id,
        },
        payload: {
          title: 'New Title',
          description: 'New Description',
          status: 'DONE',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.title).toBe('New Title');
      expect(body.data.description).toBe('New Description');
      expect(body.data.status).toBe('DONE');
    });

    it('should return 403 when updating another user\'s task', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${otherUserTaskId}`,
        headers: {
          'x-user-id': testUser1Id,
        },
        payload: {
          title: 'Hacked',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 when task does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${fakeId}`,
        headers: {
          'x-user-id': testUser1Id,
        },
        payload: {
          title: 'Updated',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/tasks/:id/archive - Archive Task', () => {
    let taskId: string;

    beforeEach(async () => {
      const task = await testDb.task.create({
        data: {
          title: 'Task to Archive',
          status: TaskStatus.TODO,
          userId: testUser1Id,
        },
      });
      taskId = task.id;
    });

    it('should archive a task', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/tasks/${taskId}/archive`,
        headers: {
          'x-user-id': testUser1Id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ARCHIVED');
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/tasks/${taskId}/archive`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 when task does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'POST',
        url: `/api/tasks/${fakeId}/archive`,
        headers: {
          'x-user-id': testUser1Id,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id - Delete Task', () => {
    let taskId: string;
    let otherUserTaskId: string;

    beforeEach(async () => {
      const task = await testDb.task.create({
        data: {
          title: 'Task to Delete',
          status: TaskStatus.TODO,
          userId: testUser1Id,
        },
      });
      taskId = task.id;

      const otherTask = await testDb.task.create({
        data: {
          title: 'Other Task',
          status: TaskStatus.TODO,
          userId: testUser2Id,
        },
      });
      otherUserTaskId = otherTask.id;
    });

    it('should delete a task', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/tasks/${taskId}`,
        headers: {
          'x-user-id': testUser1Id,
        },
      });

      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');

      // Verify task is deleted
      const deletedTask = await testDb.task.findUnique({ where: { id: taskId } });
      expect(deletedTask).toBeNull();
    });

    it('should return 403 when deleting another user\'s task', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/tasks/${otherUserTaskId}`,
        headers: {
          'x-user-id': testUser1Id,
        },
      });

      expect(response.statusCode).toBe(403);

      // Verify task still exists
      const task = await testDb.task.findUnique({ where: { id: otherUserTaskId } });
      expect(task).not.toBeNull();
    });

    it('should return 404 when task does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/tasks/${fakeId}`,
        headers: {
          'x-user-id': testUser1Id,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/tasks/${taskId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Task Status Transitions', () => {
    it('should transition task through all statuses', async () => {
      // Create task (defaults to TODO)
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: { 'x-user-id': testUser1Id },
        payload: { title: 'Status Test Task' },
      });
      const taskId = JSON.parse(createResponse.body).data.id;

      // TODO -> IN_PROGRESS
      const inProgressResponse = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${taskId}`,
        headers: { 'x-user-id': testUser1Id },
        payload: { status: 'IN_PROGRESS' },
      });
      expect(JSON.parse(inProgressResponse.body).data.status).toBe('IN_PROGRESS');

      // IN_PROGRESS -> DONE
      const doneResponse = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${taskId}`,
        headers: { 'x-user-id': testUser1Id },
        payload: { status: 'DONE' },
      });
      expect(JSON.parse(doneResponse.body).data.status).toBe('DONE');

      // DONE -> ARCHIVED
      const archiveResponse = await app.inject({
        method: 'POST',
        url: `/api/tasks/${taskId}/archive`,
        headers: { 'x-user-id': testUser1Id },
      });
      expect(JSON.parse(archiveResponse.body).data.status).toBe('ARCHIVED');
    });
  });
});
