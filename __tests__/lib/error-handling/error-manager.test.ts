/**
 * Tests for ErrorManager
 */

import { ErrorManager } from '../../../lib/error-handling/error-manager';
import { createError, createErrorReport } from '../../factories';

// Mock AsyncStorage
const mockAsyncStorage = (global as any).mockAsyncStorage();

// Mock window object for error handling
Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
});

// Mock rxjs
jest.mock('rxjs', () => ({
  BehaviorSubject: class MockBehaviorSubject {
    private _value: any;
    private subscribers: Array<(value: any) => void> = [];

    constructor(initialValue: any) {
      this._value = initialValue;
    }

    get value() {
      return this._value;
    }

    next(value: any) {
      this._value = value;
      this.subscribers.forEach(callback => callback(value));
    }

    subscribe(callback: (value: any) => void) {
      this.subscribers.push(callback);
      // Call immediately with current value
      callback(this._value);
      return {
        unsubscribe: () => {
          const index = this.subscribers.indexOf(callback);
          if (index > -1) {
            this.subscribers.splice(index, 1);
          }
        }
      };
    }

    asObservable() {
      return this;
    }
  },
}));

describe('lib/error-handling/ErrorManager', () => {
  let errorManager: ErrorManager;

  // Helper function to get current errors synchronously
  const getCurrentErrors = () => {
    let currentErrors: any[] = [];
    errorManager.getErrors$().subscribe(errors => {
      currentErrors = errors;
    }).unsubscribe();
    return currentErrors;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (ErrorManager as any).instance = undefined;
    errorManager = ErrorManager.getInstance();

    // Mock the saveToStorage method to trigger AsyncStorage calls
    jest.spyOn(errorManager as any, 'saveToStorage').mockImplementation(() => {
      mockAsyncStorage.setItem('cobalt-errors-v1', JSON.stringify([]));
    });
  });

  afterEach(() => {
    errorManager.clearErrors();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ErrorManager.getInstance();
      const instance2 = ErrorManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('logError', () => {
    it('should log a basic error', () => {
      const errorId = errorManager.logError(
        'TEST_ERROR',
        'Test error message',
        'test-source'
      );

      expect(errorId).toBeDefined();
      expect(typeof errorId).toBe('string');

      const errors = getCurrentErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        id: errorId,
        code: 'TEST_ERROR',
        message: 'Test error message',
        source: 'test-source',
        severity: 'medium',
        resolved: false,
        retryCount: 0,
      });
    });

    it('should log error with custom severity', () => {
      const errorId = errorManager.logError(
        'CRITICAL_ERROR',
        'Critical error message',
        'test-source',
        'critical'
      );

      const errors = getCurrentErrors();
      expect(errors[0]?.severity).toBe('critical');
    });

    it('should log error with details and context', () => {
      const details = { userId: '123', action: 'download' };
      const context = { screen: 'downloads', timestamp: Date.now() };

      const errorId = errorManager.logError(
        'USER_ERROR',
        'User action failed',
        'downloads',
        'high',
        details,
        context
      );

      const errors = getCurrentErrors();
      expect(errors[0]).toMatchObject({
        details,
        context,
      });
    });

    it('should include stack trace in development', () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = true;

      const errorId = errorManager.logError(
        'DEV_ERROR',
        'Development error',
        'test'
      );

      const errors = getCurrentErrors();
      expect(errors[0]?.stackTrace).toBeDefined();

      (global as any).__DEV__ = originalDev;
    });

    it('should not include stack trace in production', () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = false;

      const errorId = errorManager.logError(
        'PROD_ERROR',
        'Production error',
        'test'
      );

      const errors = getCurrentErrors();
      expect(errors[0]?.stackTrace).toBeUndefined();

      (global as any).__DEV__ = originalDev;
    });
  });

  describe('logJSError', () => {
    it('should log JavaScript errors', () => {
      const jsError = new Error('JavaScript error');
      jsError.stack = 'Error: JavaScript error\n    at test.js:1:1';

      const errorId = errorManager.logJSError(jsError, 'component');

      const errors = getCurrentErrors();
      expect(errors[0]).toMatchObject({
        code: 'JS_ERROR',
        message: 'JavaScript error',
        source: 'component',
        severity: 'high',
        details: {
          name: 'Error',
          stack: jsError.stack,
        },
      });
    });

    it('should handle errors without stack traces', () => {
      const jsError = new Error('Simple error');
      delete jsError.stack;

      const errorId = errorManager.logJSError(jsError, 'component');

      const errors = getCurrentErrors();
      expect(errors[0]?.details?.stack).toBeUndefined();
    });
  });

  describe('logNetworkError', () => {
    it('should log network errors', () => {
      const errorId = errorManager.logNetworkError(
        'https://api.example.com/data',
        500,
        'Internal Server Error',
        'api-client'
      );

      const errors = getCurrentErrors();
      expect(errors[0]).toMatchObject({
        code: 'NETWORK_ERROR',
        message: 'Network request failed: 500 Internal Server Error',
        source: 'api-client',
        severity: 'high',
        details: {
          url: 'https://api.example.com/data',
          status: 500,
          statusText: 'Internal Server Error',
        },
      });
    });

    it('should handle different HTTP status codes', () => {
      const testCases = [
        { status: 404, statusText: 'Not Found', expectedSeverity: 'medium' },
        { status: 401, statusText: 'Unauthorized', expectedSeverity: 'medium' },
        { status: 500, statusText: 'Internal Server Error', expectedSeverity: 'high' },
        { status: 0, statusText: 'Network Error', expectedSeverity: 'medium' },
      ];

      testCases.forEach(({ status, statusText, expectedSeverity }) => {
        errorManager.clearErrors();
        
        errorManager.logNetworkError(
          'https://api.example.com/test',
          status,
          statusText,
          'test'
        );

        const errors = getCurrentErrors();
        expect(errors[0]?.severity).toBe(expectedSeverity);
      });
    });
  });

  describe('logValidationError', () => {
    it('should log validation errors', () => {
      const errorId = errorManager.logValidationError(
        'email',
        'invalid-email',
        'required',
        'form-validation'
      );

      const errors = getCurrentErrors();
      expect(errors[0]).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed for email: required',
        source: 'form-validation',
        severity: 'low',
        details: {
          field: 'email',
          value: 'invalid-email',
          rule: 'required',
        },
      });
    });
  });

  describe('resolveError', () => {
    it('should mark error as resolved', () => {
      const errorId = errorManager.logError('TEST', 'Test', 'test');
      
      errorManager.resolveError(errorId);

      const errors = getCurrentErrors();
      expect(errors[0]?.resolved).toBe(true);
      expect(errors[0]?.resolvedAt).toBeDefined();
    });

    it('should handle non-existent error IDs', () => {
      expect(() => {
        errorManager.resolveError('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('retryError', () => {
    it('should increment retry count', () => {
      const errorId = errorManager.logError('TEST', 'Test', 'test');
      
      errorManager.retryError(errorId);

      const errors = getCurrentErrors();
      expect(errors[0]?.retryCount).toBe(1);
    });

    it('should execute retry function if provided', async () => {
      const errorId = errorManager.logError('TEST', 'Test', 'test');
      const retryFn = jest.fn().mockResolvedValue(undefined);
      
      await errorManager.retryError(errorId, retryFn);

      expect(retryFn).toHaveBeenCalled();
    });

    it('should handle retry function errors', async () => {
      const errorId = errorManager.logError('TEST', 'Test', 'test');
      const retryFn = jest.fn().mockRejectedValue(new Error('Retry failed'));
      
      await errorManager.retryError(errorId, retryFn);

      const errors = getCurrentErrors();
      expect(errors).toHaveLength(2); // Original error + retry error
    });
  });

  describe('error storage', () => {
    it('should save errors to storage', () => {
      errorManager.logError('TEST', 'Test', 'test');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'cobalt-errors-v1',
        expect.any(String)
      );
    });

    it('should limit stored errors', () => {
      // Log more than max errors
      for (let i = 0; i < 1005; i++) {
        errorManager.logError(`TEST_${i}`, `Test ${i}`, 'test');
      }

      const errors = getCurrentErrors();
      expect(errors.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('getStats', () => {
    it('should return error statistics', () => {
      errorManager.logError('TEST1', 'Test 1', 'source1', 'low');
      errorManager.logError('TEST2', 'Test 2', 'source1', 'high');
      errorManager.logError('TEST3', 'Test 3', 'source2', 'critical');

      const stats = errorManager.getStats();

      expect(stats.total).toBe(3);
      expect(stats.bySource).toEqual({
        source1: 2,
        source2: 1,
      });
      expect(stats.bySeverity).toEqual({
        low: 1,
        high: 1,
        critical: 1,
      });
      expect(stats.unresolved).toBe(3);
      expect(stats.criticalErrors).toHaveLength(1);
    });
  });
});
