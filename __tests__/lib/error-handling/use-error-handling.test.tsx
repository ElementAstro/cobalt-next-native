/**
 * Tests for error handling hooks
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useErrorHandler, useErrors, useAsyncOperation } from '../../../lib/error-handling/use-error-handling';
import { ErrorManager } from '../../../lib/error-handling/error-manager';

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

describe('lib/error-handling/use-error-handling', () => {
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
  });

  afterEach(() => {
    errorManager.clearErrors();
  });

  describe('useErrorHandler', () => {
    it('should provide error logging functions', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current).toHaveProperty('logError');
      expect(result.current).toHaveProperty('logJSError');
      expect(result.current).toHaveProperty('logNetworkError');
      expect(result.current).toHaveProperty('logValidationError');
      expect(result.current).toHaveProperty('resolveError');
      expect(result.current).toHaveProperty('retryError');
    });

    it('should log errors through the manager', () => {
      const { result } = renderHook(() => useErrorHandler());

      const errorId = result.current.logError(
        'TEST_ERROR',
        'Test message',
        'test-source'
      );

      expect(errorId).toBeDefined();
      const errors = getCurrentErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]?.code).toBe('TEST_ERROR');
    });

    it('should log JavaScript errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      const jsError = new Error('JS Error');

      const errorId = result.current.logJSError(jsError, 'component');

      const errors = getCurrentErrors();
      expect(errors[0]?.code).toBe('JS_ERROR');
      expect(errors[0]?.message).toBe('JS Error');
    });

    it('should log network errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      const errorId = result.current.logNetworkError(
        'https://api.test.com',
        404,
        'Not Found',
        'api'
      );

      const errors = getCurrentErrors();
      expect(errors[0]?.code).toBe('NETWORK_ERROR');
    });

    it('should log validation errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      const errorId = result.current.logValidationError(
        'email',
        'invalid',
        'format',
        'form'
      );

      const errors = getCurrentErrors();
      expect(errors[0]?.code).toBe('VALIDATION_ERROR');
    });

    it('should resolve errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      const errorId = result.current.logError('TEST', 'Test', 'test');
      result.current.resolveError(errorId);

      const errors = getCurrentErrors();
      expect(errors[0]?.resolved).toBe(true);
    });

    it('should retry errors', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const retryFn = jest.fn().mockResolvedValue(undefined);

      const errorId = result.current.logError('TEST', 'Test', 'test');
      await result.current.retryError(errorId, retryFn);

      expect(retryFn).toHaveBeenCalled();
    });
  });

  describe('useErrors', () => {
    it('should provide errors and statistics', () => {
      const { result } = renderHook(() => useErrors());

      expect(result.current).toHaveProperty('errors');
      expect(result.current).toHaveProperty('stats');
      expect(result.current).toHaveProperty('clearErrors');
      expect(result.current).toHaveProperty('clearResolvedErrors');
      expect(result.current).toHaveProperty('exportErrors');
    });

    it('should update when errors change', () => {
      const { result } = renderHook(() => useErrors());

      expect(result.current.errors).toHaveLength(0);

      act(() => {
        errorManager.logError('TEST', 'Test', 'test');
      });

      expect(result.current.errors).toHaveLength(1);
    });

    it('should provide accurate statistics', () => {
      const { result } = renderHook(() => useErrors());

      act(() => {
        errorManager.logError('TEST1', 'Test 1', 'source1', 'low');
        errorManager.logError('TEST2', 'Test 2', 'source2', 'high');
      });

      expect(result.current.stats.total).toBe(2);
      expect(result.current.stats.bySource).toEqual({
        source1: 1,
        source2: 1,
      });
      expect(result.current.stats.bySeverity).toEqual({
        low: 1,
        high: 1,
      });
    });

    it('should clear all errors', () => {
      const { result } = renderHook(() => useErrors());

      act(() => {
        errorManager.logError('TEST', 'Test', 'test');
      });

      expect(result.current.errors).toHaveLength(1);

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toHaveLength(0);
    });

    it('should clear only resolved errors', () => {
      const { result } = renderHook(() => useErrors());

      act(() => {
        const errorId1 = errorManager.logError('TEST1', 'Test 1', 'test');
        const errorId2 = errorManager.logError('TEST2', 'Test 2', 'test');
        errorManager.resolveError(errorId1);
      });

      expect(result.current.errors).toHaveLength(2);

      act(() => {
        result.current.clearResolvedErrors();
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0]?.resolved).toBe(false);
    });

    it('should export errors as JSON', () => {
      const { result } = renderHook(() => useErrors());

      act(() => {
        errorManager.logError('TEST', 'Test', 'test');
      });

      const exported = result.current.exportErrors();
      expect(typeof exported).toBe('string');
      
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('errors');
      expect(parsed).toHaveProperty('stats');
      expect(parsed).toHaveProperty('timestamp');
    });
  });

  describe('useAsyncOperation', () => {
    it('should provide async operation utilities', () => {
      const { result } = renderHook(() => useAsyncOperation());

      expect(result.current).toHaveProperty('execute');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('retry');
    });

    it('should handle successful operations', async () => {
      const { result } = renderHook(() => useAsyncOperation());
      const operation = jest.fn().mockResolvedValue('success');

      expect(result.current.isLoading).toBe(false);

      let resultValue: any;
      await act(async () => {
        resultValue = await result.current.execute(operation);
      });

      expect(operation).toHaveBeenCalled();
      expect(resultValue).toBe('success');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle operation errors', async () => {
      const { result } = renderHook(() => useAsyncOperation());
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      let resultValue: any;
      await act(async () => {
        resultValue = await result.current.execute(operation, {
          source: 'test-operation',
        });
      });

      expect(operation).toHaveBeenCalled();
      expect(resultValue).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeDefined();
    });

    it('should call success callback', async () => {
      const { result } = renderHook(() => useAsyncOperation());
      const operation = jest.fn().mockResolvedValue('success');
      const onSuccess = jest.fn();

      await act(async () => {
        await result.current.execute(operation, { onSuccess });
      });

      expect(onSuccess).toHaveBeenCalledWith('success');
    });

    it('should call error callback', async () => {
      const { result } = renderHook(() => useAsyncOperation());
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      const onError = jest.fn();

      await act(async () => {
        await result.current.execute(operation, { onError });
      });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should support retry functionality', async () => {
      const { result } = renderHook(() => useAsyncOperation());
      const operation = jest.fn().mockRejectedValue(new Error('Failed'));

      // First execution fails
      await act(async () => {
        await result.current.execute(operation, { retryable: true });
      });

      expect(result.current.error).toBeDefined();

      // Retry should work
      operation.mockResolvedValueOnce('success');
      
      let retryResult: any;
      await act(async () => {
        retryResult = await result.current.retry();
      });

      expect(retryResult).toBe('success');
      expect(result.current.error).toBeNull();
    });
  });
});
