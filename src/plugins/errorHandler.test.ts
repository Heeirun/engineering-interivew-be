import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { errorHandler } from './errorHandler';
import { AppError, NotFoundError, ValidationError } from '../utils/errors';
import * as configModule from '../config';

describe('Error Handler', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let statusSpy: ReturnType<typeof vi.fn>;
  let sendSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    statusSpy = vi.fn().mockReturnThis();
    sendSpy = vi.fn().mockReturnThis();

    mockRequest = {
      log: {
        error: vi.fn(),
      } as any,
    };

    mockReply = {
      status: statusSpy,
      send: sendSpy,
    } as any;

    // Reset to test environment defaults
    vi.spyOn(configModule, 'config', 'get').mockReturnValue({
      port: 3000,
      nodeEnv: 'test',
      databaseUrl: '',
      logLevel: 'info',
      isProd: false,
      isDev: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AppError handling', () => {
    it('should handle NotFoundError correctly', () => {
      const error = new NotFoundError('User');

      errorHandler(
        error as any,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.error).toHaveBeenCalledWith(error);
      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    });

    it('should handle ValidationError correctly', () => {
      const error = new ValidationError('Invalid input');

      errorHandler(
        error as any,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
        },
      });
    });

    it('should include stack trace in development mode', () => {
      vi.spyOn(configModule, 'config', 'get').mockReturnValue({
        port: 3000,
        nodeEnv: 'development',
        databaseUrl: '',
        logLevel: 'info',
        isProd: false,
        isDev: true,
      });

      const error = new NotFoundError('Task');

      errorHandler(
        error as any,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      const sentData = sendSpy.mock.calls[0][0];
      expect(sentData.error.stack).toBeDefined();
    });

    it('should not include stack trace in production mode', () => {
      vi.spyOn(configModule, 'config', 'get').mockReturnValue({
        port: 3000,
        nodeEnv: 'production',
        databaseUrl: '',
        logLevel: 'info',
        isProd: true,
        isDev: false,
      });

      const error = new NotFoundError('Task');

      errorHandler(
        error as any,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      const sentData = sendSpy.mock.calls[0][0];
      expect(sentData.error.stack).toBeUndefined();
    });
  });

  describe('Fastify validation errors', () => {
    it('should handle Fastify validation errors', () => {
      const error: Partial<FastifyError> = {
        validation: [
          {
            instancePath: '/email',
            schemaPath: '#/properties/email/format',
            keyword: 'format',
            params: { format: 'email' },
            message: 'must match format "email"',
          },
        ],
        validationContext: 'body',
      };

      errorHandler(
        error as FastifyError,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.validation,
        },
      });
    });

    it('should handle validation errors with multiple failures', () => {
      const error: Partial<FastifyError> = {
        validation: [
          {
            instancePath: '/email',
            schemaPath: '#/properties/email/format',
            keyword: 'format',
            params: { format: 'email' },
            message: 'must match format "email"',
          },
          {
            instancePath: '/name',
            schemaPath: '#/properties/name/minLength',
            keyword: 'minLength',
            params: { limit: 1 },
            message: 'must NOT have fewer than 1 characters',
          },
        ],
        validationContext: 'body',
      };

      errorHandler(
        error as FastifyError,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      const sentData = sendSpy.mock.calls[0][0];
      expect(sentData.error.details).toHaveLength(2);
    });
  });

  describe('Generic errors', () => {
    it('should handle generic error with statusCode', () => {
      const error: Partial<FastifyError> = {
        statusCode: 403,
        message: 'Forbidden',
        name: 'ForbiddenError',
        code: 'FORBIDDEN',
      };

      errorHandler(
        error as FastifyError,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Forbidden',
        },
      });
    });

    it('should handle generic error without statusCode (defaults to 500)', () => {
      const error: Partial<FastifyError> = {
        message: 'Something went wrong',
        name: 'Error',
      };

      errorHandler(
        error as FastifyError,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
        },
      });
    });

    it('should handle generic error without message in development', () => {
      vi.spyOn(configModule, 'config', 'get').mockReturnValue({
        port: 3000,
        nodeEnv: 'development',
        databaseUrl: '',
        logLevel: 'info',
        isProd: false,
        isDev: true,
      });

      const error: Partial<FastifyError> = {
        name: 'Error',
        statusCode: 500,
        stack: 'Error stack trace here',
      };

      errorHandler(
        error as FastifyError,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      const sentData = sendSpy.mock.calls[0][0];
      expect(sentData.success).toBe(false);
      expect(sentData.error.code).toBe('INTERNAL_ERROR');
      expect(sentData.error.message).toBe('Internal server error');
      expect(sentData.error.stack).toBeDefined();
    });

    it('should mask error message in production mode', () => {
      vi.spyOn(configModule, 'config', 'get').mockReturnValue({
        port: 3000,
        nodeEnv: 'production',
        databaseUrl: '',
        logLevel: 'info',
        isProd: true,
        isDev: false,
      });

      const error: Partial<FastifyError> = {
        message: 'Database connection failed',
        statusCode: 500,
        name: 'DatabaseError',
      };

      errorHandler(
        error as FastifyError,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      const sentData = sendSpy.mock.calls[0][0];
      expect(sentData.error.message).toBe('Internal server error'); // Masked in production
    });

    it('should show error message in development mode', () => {
      vi.spyOn(configModule, 'config', 'get').mockReturnValue({
        port: 3000,
        nodeEnv: 'development',
        databaseUrl: '',
        logLevel: 'info',
        isProd: false,
        isDev: true,
      });

      const error: Partial<FastifyError> = {
        message: 'Database connection failed',
        statusCode: 500,
        name: 'DatabaseError',
        stack: 'Error stack trace',
      };

      errorHandler(
        error as FastifyError,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      const sentData = sendSpy.mock.calls[0][0];
      expect(sentData.error.message).toBe('Database connection failed'); // Shown in development
      expect(sentData.error.stack).toBe('Error stack trace');
    });

    it('should include stack trace for generic errors in development', () => {
      vi.spyOn(configModule, 'config', 'get').mockReturnValue({
        port: 3000,
        nodeEnv: 'development',
        databaseUrl: '',
        logLevel: 'info',
        isProd: false,
        isDev: true,
      });

      const error: Partial<FastifyError> = {
        message: 'Test error',
        statusCode: 500,
        name: 'Error',
        stack: 'Error: Test error\n    at Object.<anonymous>',
      };

      errorHandler(
        error as FastifyError,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      const sentData = sendSpy.mock.calls[0][0];
      expect(sentData.error.stack).toBe('Error: Test error\n    at Object.<anonymous>');
    });

    it('should not include stack trace for generic errors in production', () => {
      vi.spyOn(configModule, 'config', 'get').mockReturnValue({
        port: 3000,
        nodeEnv: 'production',
        databaseUrl: '',
        logLevel: 'info',
        isProd: true,
        isDev: false,
      });

      const error: Partial<FastifyError> = {
        message: 'Test error',
        statusCode: 500,
        name: 'Error',
        stack: 'Error: Test error\n    at Object.<anonymous>',
      };

      errorHandler(
        error as FastifyError,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      const sentData = sendSpy.mock.calls[0][0];
      expect(sentData.error.stack).toBeUndefined();
    });

    it('should not include stack trace in test environment', () => {
      vi.spyOn(configModule, 'config', 'get').mockReturnValue({
        port: 3000,
        nodeEnv: 'test',
        databaseUrl: '',
        logLevel: 'info',
        isProd: false,
        isDev: false,
      });

      const error: Partial<FastifyError> = {
        message: 'Test error',
        statusCode: 500,
        name: 'Error',
        stack: 'Error: Test error\n    at Object.<anonymous>',
      };

      errorHandler(
        error as FastifyError,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      const sentData = sendSpy.mock.calls[0][0];
      expect(sentData.error.stack).toBeUndefined();
    });
  });

  describe('Logging', () => {
    it('should log all types of errors', () => {
      const error = new NotFoundError('Resource');

      errorHandler(
        error as any,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.error).toHaveBeenCalledWith(error);
      expect(mockRequest.log?.error).toHaveBeenCalledTimes(1);
    });

    it('should log validation errors', () => {
      const error: Partial<FastifyError> = {
        validation: [
          {
            instancePath: '/email',
            schemaPath: '#/properties/email/format',
            keyword: 'format',
            params: { format: 'email' },
            message: 'must match format "email"',
          },
        ],
        validationContext: 'body',
      };

      errorHandler(
        error as FastifyError,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.error).toHaveBeenCalledWith(error);
    });

    it('should log generic errors', () => {
      const error: Partial<FastifyError> = {
        message: 'Unexpected error',
        statusCode: 500,
        name: 'Error',
      };

      errorHandler(
        error as FastifyError,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.error).toHaveBeenCalledWith(error);
    });
  });
});
