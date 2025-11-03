import { describe, it, expect } from 'vitest';
import {
  createTaskSchema,
  updateTaskSchema,
  getTaskSchema,
  listTasksSchema,
  deleteTaskSchema,
  archiveTaskSchema,
} from './task';

describe('Task Validators', () => {
  describe('createTaskSchema', () => {
    it('should require title in body', () => {
      expect(createTaskSchema.body.required).toContain('title');
    });

    it('should have title with correct constraints', () => {
      expect(createTaskSchema.body.properties.title).toEqual({
        type: 'string',
        minLength: 1,
        maxLength: 200,
      });
    });

    it('should have optional description with max length', () => {
      expect(createTaskSchema.body.properties.description).toEqual({
        type: 'string',
        maxLength: 2000,
      });
      expect(createTaskSchema.body.required).not.toContain('description');
    });

    it('should have optional status with valid enum values', () => {
      expect(createTaskSchema.body.properties.status).toEqual({
        type: 'string',
        enum: ['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED'],
      });
    });

    it('should not allow additional properties', () => {
      expect(createTaskSchema.body.additionalProperties).toBe(false);
    });
  });

  describe('updateTaskSchema', () => {
    it('should have all properties as optional', () => {
      expect(updateTaskSchema.body.required).toBeUndefined();
    });

    it('should have title with correct constraints', () => {
      expect(updateTaskSchema.body.properties.title).toEqual({
        type: 'string',
        minLength: 1,
        maxLength: 200,
      });
    });

    it('should validate UUID in params', () => {
      expect(updateTaskSchema.params.required).toContain('id');
      expect(updateTaskSchema.params.properties.id.type).toBe('string');
      expect(updateTaskSchema.params.properties.id.pattern).toBe(
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      );
    });
  });

  describe('getTaskSchema', () => {
    it('should validate UUID in params', () => {
      expect(getTaskSchema.params.required).toContain('id');
      expect(getTaskSchema.params.properties.id.type).toBe('string');
      expect(getTaskSchema.params.properties.id.pattern).toBe(
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      );
    });
  });

  describe('listTasksSchema', () => {
    it('should have optional status filter in querystring', () => {
      expect(listTasksSchema.querystring.properties.status).toEqual({
        type: 'string',
        enum: ['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED'],
      });
    });

    it('should not require any query parameters', () => {
      expect(listTasksSchema.querystring.required).toBeUndefined();
    });
  });

  describe('deleteTaskSchema', () => {
    it('should validate UUID in params', () => {
      expect(deleteTaskSchema.params.required).toContain('id');
      expect(deleteTaskSchema.params.properties.id.type).toBe('string');
    });
  });

  describe('archiveTaskSchema', () => {
    it('should validate UUID in params', () => {
      expect(archiveTaskSchema.params.required).toContain('id');
      expect(archiveTaskSchema.params.properties.id.type).toBe('string');
    });
  });

  describe('Task Status Enum', () => {
    const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED'];

    it('should have consistent status enum across all schemas', () => {
      expect(createTaskSchema.body.properties.status.enum).toEqual(validStatuses);
      expect(updateTaskSchema.body.properties.status.enum).toEqual(validStatuses);
      expect(listTasksSchema.querystring.properties.status.enum).toEqual(validStatuses);
    });

    it('should contain all required task statuses', () => {
      const statusEnum = createTaskSchema.body.properties.status.enum;
      expect(statusEnum).toHaveLength(4);
      expect(statusEnum).toContain('TODO');
      expect(statusEnum).toContain('IN_PROGRESS');
      expect(statusEnum).toContain('DONE');
      expect(statusEnum).toContain('ARCHIVED');
    });
  });

  describe('UUID Pattern', () => {
    const uuidPattern = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    it('should use consistent UUID pattern across schemas', () => {
      expect(updateTaskSchema.params.properties.id.pattern).toBe(uuidPattern);
      expect(getTaskSchema.params.properties.id.pattern).toBe(uuidPattern);
      expect(deleteTaskSchema.params.properties.id.pattern).toBe(uuidPattern);
      expect(archiveTaskSchema.params.properties.id.pattern).toBe(uuidPattern);
    });
  });

  describe('Schema Types', () => {
    it('should have object type for all schemas', () => {
      expect(createTaskSchema.body.type).toBe('object');
      expect(updateTaskSchema.body.type).toBe('object');
      expect(listTasksSchema.querystring.type).toBe('object');
    });
  });
});
