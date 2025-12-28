import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  handleError,
  success,
  failure,
  withErrorHandling,
} from './errors';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

import { toast } from 'sonner';

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with all properties', () => {
      const error = new AppError('Test error', 'TEST_CODE', 400, { extra: 'data' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({ extra: 'data' });
      expect(error.name).toBe('AppError');
    });

    it('should default statusCode to 500', () => {
      const error = new AppError('Test error', 'TEST_CODE');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with 400 status', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NotFoundError', () => {
    it('should create a not found error for a resource', () => {
      const error = new NotFoundError('User', '123');

      expect(error.message).toBe('User with id 123 not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.context).toEqual({ resource: 'User', id: '123' });
    });

    it('should handle missing id', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User not found');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create an unauthorized error', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized access');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
    });

    it('should accept custom message', () => {
      const error = new UnauthorizedError('Token expired');

      expect(error.message).toBe('Token expired');
    });
  });
});

describe('handleError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should log the error to console', () => {
    const error = new Error('Test error');

    handleError('TestContext', error, { showToast: false });

    expect(console.error).toHaveBeenCalled();
  });

  it('should show toast by default', () => {
    const error = new Error('Test error');

    handleError('TestContext', error);

    expect(toast.error).toHaveBeenCalled();
  });

  it('should not show toast when disabled', () => {
    const error = new Error('Test error');

    handleError('TestContext', error, { showToast: false });

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should use custom message when provided', () => {
    const error = new Error('Technical error');

    handleError('TestContext', error, { customMessage: 'User friendly message' });

    expect(toast.error).toHaveBeenCalledWith('User friendly message');
  });

  it('should rethrow when requested', () => {
    const error = new Error('Test error');

    expect(() => {
      handleError('TestContext', error, { showToast: false, rethrow: true });
    }).toThrow('Test error');
  });
});

describe('Result helpers', () => {
  describe('success', () => {
    it('should create a success result', () => {
      const result = success({ id: '123' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123' });
    });
  });

  describe('failure', () => {
    it('should create a failure result', () => {
      const error = new Error('Test error');
      const result = failure(error);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });
  });
});

describe('withErrorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should return the result on success', async () => {
    const fn = async () => ({ data: 'test' });
    const wrapped = withErrorHandling(fn, 'TestContext', { showToast: false });

    const result = await wrapped();

    expect(result).toEqual({ data: 'test' });
  });

  it('should return undefined on error', async () => {
    const fn = async () => {
      throw new Error('Test error');
    };
    const wrapped = withErrorHandling(fn, 'TestContext', { showToast: false });

    const result = await wrapped();

    expect(result).toBeUndefined();
  });

  it('should call handleError on error', async () => {
    const fn = async () => {
      throw new Error('Test error');
    };
    const wrapped = withErrorHandling(fn, 'TestContext');

    await wrapped();

    expect(console.error).toHaveBeenCalled();
  });
});
