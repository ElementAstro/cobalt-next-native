/**
 * Test Helpers
 * Utility functions for testing
 */

import { act, waitFor } from '@testing-library/react-native';

/**
 * Wait for a condition to be true with timeout
 */
export const waitForCondition = async (
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (!condition() && Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

/**
 * Wait for async operations to complete
 */
export const waitForAsync = async (ms: number = 0): Promise<void> => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, ms));
  });
};

/**
 * Mock timer helpers
 */
export const mockTimers = () => {
  jest.useFakeTimers();
  return {
    advanceTimersByTime: (ms: number) => act(() => jest.advanceTimersByTime(ms)),
    runAllTimers: () => act(() => jest.runAllTimers()),
    runOnlyPendingTimers: () => act(() => jest.runOnlyPendingTimers()),
    restore: () => jest.useRealTimers(),
  };
};

/**
 * Create a mock function with call tracking
 */
export const createMockWithTracking = <T extends (...args: any[]) => any>(
  implementation?: T
) => {
  const calls: any[] = [];
  const mockFn = jest.fn((...args) => {
    calls.push(args);
    return implementation ? implementation(...args) : undefined;
  });

  (mockFn as any).getCallHistory = () => [...calls];
  return mockFn as jest.MockedFunction<T> & { getCallHistory: () => any[] };
};

/**
 * Create a promise that can be resolved/rejected externally
 */
export const createControllablePromise = <T = any>() => {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  
  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
};

/**
 * Mock console methods and capture output
 */
export const mockConsole = () => {
  const originalConsole = { ...console };
  const logs: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  
  console.log = jest.fn((...args) => logs.push(args.join(' ')));
  console.warn = jest.fn((...args) => warnings.push(args.join(' ')));
  console.error = jest.fn((...args) => errors.push(args.join(' ')));
  
  return {
    logs,
    warnings,
    errors,
    restore: () => {
      Object.assign(console, originalConsole);
    },
  };
};

/**
 * Create a mock store for testing
 */
export const createMockStore = <T>(initialState: T) => {
  let state = { ...initialState };
  const subscribers: Array<(state: T) => void> = [];
  
  return {
    getState: () => state,
    setState: (newState: Partial<T>) => {
      state = { ...state, ...newState };
      subscribers.forEach(callback => callback(state));
    },
    subscribe: (callback: (state: T) => void) => {
      subscribers.push(callback);
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) subscribers.splice(index, 1);
      };
    },
    reset: () => {
      state = { ...initialState };
      subscribers.forEach(callback => callback(state));
    },
  };
};

/**
 * Test error boundary helper
 */
export const expectToThrow = async (fn: () => void | Promise<void>, expectedError?: string) => {
  let error: Error | undefined;
  
  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }
  
  expect(error).toBeDefined();
  if (expectedError) {
    expect(error?.message).toContain(expectedError);
  }
  
  return error;
};

/**
 * Mock network conditions
 */
export const mockNetworkConditions = (isOnline: boolean = true, isSlowConnection: boolean = false) => {
  const originalNavigator = global.navigator;
  
  Object.defineProperty(global, 'navigator', {
    value: {
      ...originalNavigator,
      onLine: isOnline,
      connection: {
        effectiveType: isSlowConnection ? '2g' : '4g',
        downlink: isSlowConnection ? 0.5 : 10,
        rtt: isSlowConnection ? 2000 : 100,
      },
    },
    writable: true,
  });
  
  return {
    restore: () => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    },
  };
};

/**
 * Create a mock file for testing file operations
 */
export const createMockFile = (name: string, content: string, type: string = 'text/plain') => ({
  name,
  size: content.length,
  type,
  lastModified: Date.now(),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(content.length)),
  text: () => Promise.resolve(content),
  stream: () => new ReadableStream(),
  slice: () => createMockFile(name, content.slice(0, 100), type),
});

/**
 * Suppress console warnings during tests
 */
export const suppressConsoleWarnings = (patterns: string[] = []) => {
  const originalWarn = console.warn;
  
  console.warn = jest.fn((message: string) => {
    const shouldSuppress = patterns.some(pattern => message.includes(pattern));
    if (!shouldSuppress) {
      originalWarn(message);
    }
  });
  
  return {
    restore: () => {
      console.warn = originalWarn;
    },
  };
};

/**
 * Create a test wrapper for async operations
 */
export const createAsyncTestWrapper = (timeout: number = 10000) => {
  return async (testFn: () => Promise<void>) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Test timed out after ${timeout}ms`)), timeout);
    });
    
    await Promise.race([testFn(), timeoutPromise]);
  };
};
