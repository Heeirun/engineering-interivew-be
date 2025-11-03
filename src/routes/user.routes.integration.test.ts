import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../test/helpers/testApp';
import { cleanDatabase, disconnectDatabase, testDb } from '../test/helpers/testDb';

describe('User API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectDatabase();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test (tasks first to respect FK constraints)
    await testDb.task.deleteMany();
    await testDb.user.deleteMany();
  });

  describe('POST /api/users - Create User', () => {
    it('should create a new user with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'test@example.com',
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(body.data.id).toBeDefined();
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
    });

    it('should return 400 when email is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 400 when name is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'test@example.com',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 400 when email format is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'invalid-email',
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 400 when email is too long (> 255 characters)', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com'; // Creates an email > 255 chars
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: longEmail,
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when name is empty string', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'test@example.com',
          name: '',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when name is too long (> 100 characters)', async () => {
      const longName = 'a'.repeat(101);
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'test@example.com',
          name: longName,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should accept name with exactly 100 characters', async () => {
      const maxName = 'a'.repeat(100);
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'test@example.com',
          name: maxName,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe(maxName);
    });

    it('should accept email with reasonable length', async () => {
      // Test with a long but valid email (within practical limits)
      const reasonableEmail = 'very.long.email.address.for.testing@example-domain.com';

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: reasonableEmail,
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.email).toBe(reasonableEmail);
    });

    it('should return 409 when email already exists', async () => {
      // Create first user
      await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'duplicate@example.com',
          name: 'First User',
        },
      });

      // Try to create second user with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'duplicate@example.com',
          name: 'Second User',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CONFLICT');
      expect(body.error.message).toContain('Email already in use');
    });

    it('should ignore additional properties not in schema', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'ignore-extra@example.com',
          name: 'Test User',
          extraField: 'should be ignored',
        },
      });

      // Fastify by default removes additional properties when additionalProperties: false
      // The request should succeed but the extra field is ignored
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.email).toBe('ignore-extra@example.com');
      expect(body.data.name).toBe('Test User');
      expect(body.data).not.toHaveProperty('extraField');
    });

    it('should create multiple users with different emails', async () => {
      const user1Response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'user1@example.com',
          name: 'User One',
        },
      });

      const user2Response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'user2@example.com',
          name: 'User Two',
        },
      });

      expect(user1Response.statusCode).toBe(201);
      expect(user2Response.statusCode).toBe(201);

      const user1 = JSON.parse(user1Response.body).data;
      const user2 = JSON.parse(user2Response.body).data;

      expect(user1.id).not.toBe(user2.id);
      expect(user1.email).toBe('user1@example.com');
      expect(user2.email).toBe('user2@example.com');
    });

    it('should handle special characters in name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'special@example.com',
          name: "O'Connor-Smith Jr. (PhD)",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe("O'Connor-Smith Jr. (PhD)");
    });

    it('should handle unicode characters in name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'unicode@example.com',
          name: '张伟 Müller José',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('张伟 Müller José');
    });
  });

  describe('GET /api/users/:id - Get User by ID', () => {
    let userId: string;

    beforeEach(async () => {
      // Create a test user before each test
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'getuser@example.com',
          name: 'Get User Test',
        },
      });
      userId = JSON.parse(createResponse.body).data.id;
    });

    it('should return user by valid ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/users/${userId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        id: userId,
        email: 'getuser@example.com',
        name: 'Get User Test',
      });
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
    });

    it('should return 404 when user does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'GET',
        url: `/api/users/${fakeId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toContain('User');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/invalid-uuid',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 400 for malformed UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/12345678-1234-1234-1234-12345678901', // Missing one digit
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for UUID with invalid characters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return different users for different IDs', async () => {
      // Create another user
      const user2Response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'user2@example.com',
          name: 'User Two',
        },
      });
      const user2Id = JSON.parse(user2Response.body).data.id;

      // Get first user
      const response1 = await app.inject({
        method: 'GET',
        url: `/api/users/${userId}`,
      });

      // Get second user
      const response2 = await app.inject({
        method: 'GET',
        url: `/api/users/${user2Id}`,
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      const user1 = JSON.parse(response1.body).data;
      const user2 = JSON.parse(response2.body).data;

      expect(user1.id).not.toBe(user2.id);
      expect(user1.email).toBe('getuser@example.com');
      expect(user2.email).toBe('user2@example.com');
    });
  });

  describe('User Lifecycle', () => {
    it('should handle complete user creation and retrieval flow', async () => {
      // Create user
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: 'lifecycle@example.com',
          name: 'Lifecycle Test',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const createdUser = JSON.parse(createResponse.body).data;
      expect(createdUser.id).toBeDefined();

      // Retrieve the same user
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/users/${createdUser.id}`,
      });

      expect(getResponse.statusCode).toBe(200);
      const retrievedUser = JSON.parse(getResponse.body).data;

      // Verify they match
      expect(retrievedUser).toEqual(createdUser);
    });

    it('should maintain data integrity across operations', async () => {
      const testEmail = 'integrity@example.com';
      const testName = 'Integrity Test User';

      // Create user
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          email: testEmail,
          name: testName,
        },
      });

      const userId = JSON.parse(createResponse.body).data.id;

      // Verify user exists in database
      const dbUser = await testDb.user.findUnique({ where: { id: userId } });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.email).toBe(testEmail);
      expect(dbUser?.name).toBe(testName);

      // Verify via API
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/users/${userId}`,
      });

      const apiUser = JSON.parse(getResponse.body).data;
      expect(apiUser.email).toBe(testEmail);
      expect(apiUser.name).toBe(testName);
    });
  });
});
